import { Type } from '@google/genai';

export const structured_output_config = {
  responseMimeType: "application/json",
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      reply: {
        type: Type.STRING,
        description: "Concise assistant message. Used for confirmations, follow-ups, or summaries."
      },
      function_call: {
        type: Type.OBJECT,
        description: "If an operation should be performed, this field specifies which one and with what arguments.",
        nullable: true,
        properties: {
          name: {
            type: Type.STRING,
            enum: ["add_task", "edit_task", "remove_task", "find_tasks", "none"],
            description: "The function or operation the assistant wants to perform."
          },
          arguments: {
            type: Type.OBJECT,
            description: "Arguments for the chosen function.",
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              desc: { type: Type.STRING },
              datetime: { type: Type.STRING },
              date_range: {
                type: Type.OBJECT,
                properties: {
                  start: { type: Type.STRING },
                  end: { type: Type.STRING }
                }
              },
              status: { type: Type.STRING, enum: ["pending", "done"] },
              confirmation: {
                type: Type.STRING,
                enum: ["yes", "no", "unset"]
              },
              patch: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  datetime: { type: Type.STRING },
                  date_range: {
                    type: Type.OBJECT,
                    properties: {
                      start: { type: Type.STRING },
                      end: { type: Type.STRING }
                    }
                  },
                  desc: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ["pending", "done"] }
                }
              }
            }
          }
        }
      },
      tracker: {
        type: Type.OBJECT, description: "Compact slot-filling state to carry across turns. Frontend resends this until complete.", properties: {
          op: {
            type: Type.STRING, enum: [
              "add_task",
              "edit_task",
              "remove_task",
              "find_tasks",
              "none"
            ], description: "Current operation. Use 'none' if not inferred yet."
          }, args: {
            type: Type.OBJECT, description: "Arguments accumulated so far for the operation.", properties: {
              id: {
                type: Type.STRING, description: "Target task ID for edit/remove if known."
              }, name: {
                type: Type.STRING, description: "Task name."
              }, desc: {
                type: Type.STRING, description: "Optional description."
              }, datetime: {
                type: Type.STRING, description: "ISO datetime for fixed due."
              }, date_range: {
                type: Type.OBJECT, properties: {
                  start: {
                    type: Type.STRING, description: "ISO start datetime."
                  }, end: {
                    type: Type.STRING, description: "ISO end datetime."
                  }
                }, propertyOrdering: [
                  "start",
                  "end"
                ]
              }, status: {
                type: Type.STRING, enum: [
                  "pending",
                  "done"
                ], description: "For edits."
              }, confirmation: {
                type: Type.STRING, enum: [
                  "yes",
                  "no",
                  "unset"
                ], description: "User confirmation for edit/remove; 'unset' if not asked yet."
              }
            }
          }, missing: {
            type: Type.ARRAY, description: "Which fields are still needed to execute the operation.", items: {
              type: Type.STRING
            }
          }, needsConfirmation: {
            type: Type.BOOLEAN, description: "True if the operation requires confirmation (e.g., edit/remove) and confirmation is not yet 'yes'."
          }
        }, propertyOrdering: [
          "op",
          "args",
          "missing",
          "needsConfirmation"
        ]
      }
    },
    required: ["reply"],
    propertyOrdering: ["reply", "function_call", "tracker"]
  }
};
