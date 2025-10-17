import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse, GenerateContentParameters } from "@google/genai";
import { TaskStatus } from "../types";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'addComplaint',
    description: 'Adds a new maintenance complaint to the system. Use this only for creating brand new tasks.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: {
          type: Type.NUMBER,
          description: 'A unique numeric ID for the new task.'
        },
        description: {
          type: Type.STRING,
          description: 'A detailed description of the complaint.',
        },
        assignedTo: {
          type: Type.STRING,
          description: 'The name of the person assigned to the task. Defaults to "Unassigned" if not provided.',
        },
      },
      required: ['id', 'description'],
    },
  },
  {
    name: 'updateTask',
    description: 'Updates an existing maintenance task. Can be used to change the status or the assignee.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskId: {
          type: Type.NUMBER,
          description: 'The ID of the task to update.',
        },
        status: {
          type: Type.STRING,
          description: `The new status of the task. Must be one of: ${Object.values(TaskStatus).join(', ')}`,
          enum: Object.values(TaskStatus),
        },
        assignedTo: {
          type: Type.STRING,
          description: 'The name of the new person assigned to the task.',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'deleteTask',
    description: 'Deletes a maintenance task from the system.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskId: {
          type: Type.NUMBER,
          description: 'The ID of the task to delete.',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'getTasks',
    description: 'Retrieves a list of maintenance tasks, optionally filtered by status.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: `The status to filter tasks by. If omitted, all tasks are returned. Must be one of: ${Object.values(TaskStatus).join(', ')}`,
          enum: Object.values(TaskStatus),
        },
      },
    },
  },
  {
    name: 'createGoogleSheetForTask',
    description: 'Creates a downloadable, styled spreadsheet (.xls file) with the details of a specific task. Statuses are color-coded for easy viewing.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskId: {
          type: Type.NUMBER,
          description: 'The ID of the task to create a spreadsheet for.',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'createGoogleSheetForAllTasks',
    description: 'Creates a single downloadable, styled spreadsheet (.xls file) containing all tasks. Statuses are color-coded for easy viewing.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

// FIX: Corrected multiple syntax errors inside the `ai.models.generateContent` call.
// The object passed to the function was malformed, containing invalid properties
// which caused a cascade of compilation errors. The function body is now corrected
// to use the proper structure and includes the previously missing return statement.
export const callGeminiApi = async (history: GenerateContentParameters['contents']): Promise<GenerateContentResponse> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: history,
    config: {
      tools: [{ functionDeclarations }],
      systemInstruction: `You are a highly intelligent and professional AI assistant for a maintenance department. Your primary role is to manage tasks with precision and clarity by calling the provided functions.

            **Core Principles:**
            1.  **Clarity is Key:** Always be clear and unambiguous. If a user's request is vague, ask for clarification.
            2.  **Accuracy Matters:** Pay close attention to data types. A task 'id' is always a unique number. An 'assignedTo' value is always a person's name (a string). Never confuse them. If a user says "assign task to John," they mean the 'assignedTo' property.
            3.  **Be Proactive:** Anticipate user needs. For example, after creating a task, ask if they want a spreadsheet for it. When asked for status, provide a summary first.
            4.  **Confirm Destructive Actions:** Before you call the 'deleteTask' function, you MUST ask the user for confirmation (e.g., "Are you sure you want to delete task ID 123? This action cannot be undone."). Only proceed if they confirm.

            **Function Usage Guide:**
            -   **\`addComplaint\`**: Use ONLY for creating a brand new task. You must gather a unique numeric ID and a description from the user first.
            -   **\`updateTask\`**: Use for modifying an EXISTING task. This can be changing the 'status' or re-assigning it to a different person ('assignedTo').
            -   **\`deleteTask\`**: Use to remove a task. ALWAYS confirm with the user first.
            -   **\`getTasks\`**: Use to list tasks. When asked for a general status, summarize counts by status before listing them.
            -   **\`createGoogleSheet...\`**: Use when the user explicitly asks for a spreadsheet.
            
            Always confirm the successful completion of an action. For example, after an update, say "Task 123 has been updated. The status is now 'In Progress' and it is assigned to Jane."`
        },
    });

  return response;
};
