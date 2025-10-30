import { NextRequest } from 'next/server';
import { GoogleGenAI } from "@google/genai";
export const runtime = 'nodejs';
import { structured_output_config } from './configs/structured_output';
import { track } from 'framer-motion/client';
import { tools } from './configs/tools';

type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'toolCall'; name: string; args: any }
  | { type: 'done' };

export async function POST(req: NextRequest) {
  const { message, chatHistory } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start: async (controller) => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

        // Provide current tasks as context so Gemini can reference them for edit/remove/find.
        const system = `
You are an AI Task Manager Assistant.
Your job is to help add/edit/remove/find tasks.

Instructions:

Use the chat history to infer as much information as possible about the user's intent.

If any required information is missing (for example, task name, datetime, date range, etc.), ask concise, context-aware follow-up questions until all required details are gathered.

Once all mandatory fields are collected from the conversation, make the function call (add_task, edit_task, remove_task, or find_tasks).

For edit or delete (remove) operations, always ask for confirmation if it hasn't been explicitly given yet.

Avoid repeating already-known information from the chat history.

Keep your replies short, natural, and consistent with the tone of a helpful productivity assistant.

Goal:
Ensure that before every function call, all necessary parameters are known and confirmed.
        `.trim();
        // var temp = JSON.stringify({ system, user: message }, null, 2);
        // const contents = [
        //   { role: 'user', parts: [{ text: temp }] },
        // ];
        
        const chat = ai.chats.create({
          model: "gemini-2.5-flash",
          history: chatHistory,
          config: {
            tools: tools, 
            systemInstruction: system,
          },
        });

        // Call Gemini with tools; function calling returns functionCalls.
        const response = await chat.sendMessage({message})
        // Emit assistant text (if any)
        const text = response.text;
        console.log("Generated response: ", text);
        if (text) {
          const event: StreamEvent = { type: 'text', text: text };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }

        // Emit function calls (tool calls)
        // SDK returns functionCalls on response; each has name + args
        const calls = (response as any).functionCalls ?? {};

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
