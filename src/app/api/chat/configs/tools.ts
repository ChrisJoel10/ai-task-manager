import { Type } from "@google/genai";

export const tools = [
  {
    functionDeclarations: [
      {
        name: 'add_task',
        description: 'Add a new task using either a fixed datetime or a date range.',
        parameters: {
          oneOf: [ // ✅ note: use `oneOf`, not `one_of`
            {
              type: Type.OBJECT,
              required: ['name', 'datetime'],
              properties: {
                name: { type: Type.STRING, description: 'Task name.' },
                datetime: { type: Type.STRING, description: 'ISO datetime, e.g., 2025-10-20T12:00:00Z.' },
                desc: { type: Type.STRING, description: 'Optional description.' }
              }
            },
            {
              type: Type.OBJECT,
              required: ['name', 'date_range'],
              properties: {
                name: { type: Type.STRING, description: 'Task name.' },
                date_range: {
                  type: Type.OBJECT,
                  required: ['start', 'end'],
                  properties: {
                    start: { type: Type.STRING, description: 'ISO start datetime.' },
                    end: { type: Type.STRING, description: 'ISO end datetime.' }
                  }
                },
                desc: { type: Type.STRING, description: 'Optional description.' }
              }
            }
          ]
        }
      },
      {
        name: 'edit_task',
        description: 'Edit an existing task by id or exact name; include fields to change in patch.',
        parameters: {
          oneOf: [
            {
              type: Type.OBJECT,
              required: ['id', 'patch'],
              properties: {
                id: { type: Type.STRING, description: 'Task ID.' },
                patch: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    datetime: { type: Type.STRING, description: 'If set, clears date_range.' },
                    date_range: {
                      type: Type.OBJECT,
                      required: ['start', 'end'],
                      properties: {
                        start: { type: Type.STRING },
                        end: { type: Type.STRING }
                      }
                    },
                    desc: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['pending', 'done'] }
                  }
                }
              }
            },
            {
              type: Type.OBJECT,
              required: ['name', 'patch'],
              properties: {
                name: { type: Type.STRING, description: 'Exact task name if ID unknown.' },
                patch: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    datetime: { type: Type.STRING, description: 'If set, clears date_range.' },
                    date_range: {
                      type: Type.OBJECT,
                      required: ['start', 'end'],
                      properties: {
                        start: { type: Type.STRING },
                        end: { type: Type.STRING }
                      }
                    },
                    desc: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['pending', 'done'] }
                  }
                }
              }
            }
          ]
        }
      },
      {
        name: 'remove_task',
        description: 'Remove a task by id or exact name.',
        parameters: {
          oneOf: [
            {
              type: Type.OBJECT,
              required: ['id'],
              properties: { id: { type: Type.STRING, description: 'Task ID.' } }
            },
            {
              type: Type.OBJECT,
              required: ['name'],
              properties: { name: { type: Type.STRING, description: 'Exact task name.' } }
            }
          ]
        }
      },
      {
        name: 'find_tasks',
        description: 'Find tasks by optional filters; returns a textual summary.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Partial name match (case-insensitive).' },
            status: { type: Type.STRING, enum: ['pending', 'done'] },
            before: { type: Type.STRING, description: 'ISO datetime upper bound.' },
            after: { type: Type.STRING, description: 'ISO datetime lower bound.' }
          }
        }
      }
    ]
  }
];
