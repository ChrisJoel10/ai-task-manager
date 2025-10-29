export const tools = [
  {
    functionDeclarations: [
      {
        name: 'add_task',
        description: 'Add a new task using either a fixed datetime or a date range.',
        parameters: {
          one_of: [
            {
              type: 'object',
              required: ['name', 'datetime'],
              properties: {
                name: { type: 'string', description: 'Task name.' },
                datetime: { type: 'string', description: 'ISO datetime, e.g., 2025-10-20T12:00:00Z.' },
                desc: { type: 'string', description: 'Optional description.' }
              }
            },
            {
              type: 'object',
              required: ['name', 'date_range'],
              properties: {
                name: { type: 'string', description: 'Task name.' },
                date_range: {
                  type: 'object',
                  required: ['start', 'end'],
                  properties: {
                    start: { type: 'string', description: 'ISO start datetime.' },
                    end: { type: 'string', description: 'ISO end datetime.' }
                  }
                },
                desc: { type: 'string', description: 'Optional description.' }
              }
            }
          ]
        }
      },
      {
        name: 'edit_task',
        description: 'Edit an existing task by id or exact name; include fields to change in patch.',
        parameters: {
          one_of: [
            {
              type: 'object',
              required: ['id', 'patch'],
              properties: {
                id: { type: 'string', description: 'Task ID.' },
                patch: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    datetime: { type: 'string', description: 'If set, clears date_range.' },
                    date_range: {
                      type: 'object',
                      required: ['start', 'end'],
                      properties: {
                        start: { type: 'string' },
                        end: { type: 'string' }
                      }
                    },
                    desc: { type: 'string' },
                    status: { type: 'string', enum: ['pending', 'done'] }
                  }
                }
              }
            },
            {
              type: 'object',
              required: ['name', 'patch'],
              properties: {
                name: { type: 'string', description: 'Exact task name if ID unknown.' },
                patch: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    datetime: { type: 'string', description: 'If set, clears date_range.' },
                    date_range: {
                      type: 'object',
                      required: ['start', 'end'],
                      properties: {
                        start: { type: 'string' },
                        end: { type: 'string' }
                      }
                    },
                    desc: { type: 'string' },
                    status: { type: 'string', enum: ['pending', 'done'] }
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
          one_of: [
            {
              type: 'object',
              required: ['id'],
              properties: { id: { type: 'string', description: 'Task ID.' } }
            },
            {
              type: 'object',
              required: ['name'],
              properties: { name: { type: 'string', description: 'Exact task name.' } }
            }
          ]
        }
      },
      {
        name: 'find_tasks',
        description: 'Find tasks by optional filters; returns a textual summary.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Partial name match (case-insensitive).' },
            status: { type: 'string', enum: ['pending', 'done'] },
            before: { type: 'string', description: 'ISO datetime upper bound.' },
            after: { type: 'string', description: 'ISO datetime lower bound.' }
          }
        }
      }
    ]
  }
];
