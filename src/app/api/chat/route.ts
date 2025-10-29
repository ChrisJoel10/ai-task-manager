import { NextRequest } from 'next/server';
import { GoogleGenAI } from "@google/genai";
export const runtime = 'nodejs';
import { structured_output_config } from './configs/structured_output';
import { track } from 'framer-motion/client';

type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'toolCall'; name: string; args: any }
  | { type: 'done' };

export async function POST(req: NextRequest) {
  const { message, contextTasks, tracker } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start: async (controller) => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

        // Provide current tasks as context so Gemini can reference them for edit/remove/find.
        const system = `
You are an intelligent assistant for an AI Task Manager.

Your goal is to understand user requests about tasks and produce structured JSON output following the given schema. 
Each response must include:
- 'reply': a concise message to the user.
- 'function_call': when ready to execute a task-related action.
- 'tracker': a compact object maintaining conversational state.

Guidelines:
1. Always fill mandatory fields ('name' + 'datetime' or 'date_range') before producing a 'function_call' with 'add_task'.
2. Use the 'tracker' object to record missing fields, inferred operation, and progress across turns.
3. If required data is missing, **ask a concise follow-up question** and update the 'tracker' accordingly.
4. Once all required fields are collected, **return a valid 'function_call' object** (e.g., 'add_task', 'edit_task', 'remove_task', 'find_tasks') with all arguments filled.
5. When a 'function_call' is returned, **set the 'tracker' object to an empty object '{}'**, indicating the task is complete.
6. Use ISO 8601 format for all date and time values (e.g., '2025-10-21T19:00:00Z').
7. Only return **one function_call per turn**, unless explicitly asked to batch multiple operations.
8. If editing, removing, or finding tasks, use the provided 'contextTasks' to identify correct targets.

Be precise, structured, and consistent with the schema.
        `.trim();
        var temp = JSON.stringify({ system, contextTasks, user: message, tracker }, null, 2);
        const contents = [
          { role: 'user', parts: [{ text: temp }] },
        ];
        // Call Gemini with tools; function calling returns functionCalls.
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            responseSchema: structured_output_config.responseSchema, 
            responseMimeType: structured_output_config.responseMimeType,
          },
        });

        // Emit assistant text (if any)
        const text = response.text;
        var res = JSON.parse(text);
        console.log("Generated response: ", text);
        if (text) {
          const event: StreamEvent = { type: 'text', text: text };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }

        // Emit function calls (tool calls)
        // SDK returns functionCalls on response; each has name + args
        const calls = (res as any).function_call ?? {};

        console.log("Function calls: ", calls);
        if(calls) {
          const event: StreamEvent = { type: 'toolCall', name: calls.name, args: calls.arguments ?? {} };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (e: any) {
        const event: StreamEvent = { type: 'text', text: `Error: ${e.message}` };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
        throw e;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
