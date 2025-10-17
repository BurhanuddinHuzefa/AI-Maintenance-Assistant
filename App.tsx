import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Dashboard } from './components/Dashboard';
import { Task, TaskStatus, ChatMessage } from './types';
import { INITIAL_TASKS } from './constants';
import { callGeminiApi } from './services/geminiService';
import { FunctionCall, GenerateContentParameters, Part } from '@google/genai';

// FIX: Define Content type explicitly.
// `GenerateContentParameters['contents']` is a union type that might not be an array,
// making the indexed access `[0]` unsafe and causing a compile error.
// This app specifically uses chat history, where each turn is a `Content` object.
type Content = {
  role: 'user' | 'model' | 'tool';
  parts: Part[];
};

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const savedTasks = localStorage.getItem('maintenanceTasks');
      return savedTasks ? JSON.parse(savedTasks) : INITIAL_TASKS;
    // FIX: Added curly braces to the catch block to fix syntax error and subsequent scope issues.
    } catch (error) {
      console.error("Failed to parse tasks from localStorage", error);
      return INITIAL_TASKS;
    }
  });
  
  const [conversationHistory, setConversationHistory] = useState<Content[]>(() => {
    try {
      const savedHistory = localStorage.getItem('conversationHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Failed to parse conversation history from localStorage", error);
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    try {
        localStorage.setItem('maintenanceTasks', JSON.stringify(tasks));
    } catch (error) {
        console.error("Failed to save tasks to localStorage", error);
    }
  }, [tasks]);

  useEffect(() => {
    try {
        localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
    } catch (error) {
        console.error("Failed to save conversation history to localStorage", error);
    }
  }, [conversationHistory]);

  const generateStyledHtmlForTasks = (tasksToExport: Task[], title: string) => {
    const statusStyles = {
        [TaskStatus.Pending]: 'background-color: #FEF3C7; color: #92400E;',
        [TaskStatus.InProgress]: 'background-color: #DBEAFE; color: #1E40AF;',
        [TaskStatus.Completed]: 'background-color: #D1FAE5; color: #065F46;',
    };
    
    const tableRows = tasksToExport.map(task => `
        <tr>
            <td>${task.id}</td>
            <td>${task.description}</td>
            <td style="${statusStyles[task.status]}">${task.status}</td>
            <td>${task.assignedTo}</td>
            <td>${task.date}</td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: sans-serif; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #dddddd; text-align: left; padding: 8px; }
                th { background-color: #f2f2f2; font-weight: bold; }
                h2 { color: #333; }
            </style>
        </head>
        <body>
            <h2>${title}</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Assigned To</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </body>
        </html>
    `;
  };

  const downloadStyledSheet = (htmlContent: string, filename: string) => {
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const functions: { [key: string]: (...args: any[]) => any } = {
    addComplaint: (id: number, description: string, assignedTo?: string) => {
      if (tasks.some(task => task.id === id)) {
        return { success: false, message: `Task with ID ${id} already exists. Please use a unique ID.` };
      }
      const newTask: Task = {
        id,
        description,
        status: TaskStatus.Pending,
        assignedTo: assignedTo || 'Unassigned',
        date: new Date().toISOString().split('T')[0],
      };
      setTasks(prev => [newTask, ...prev]);
      return { success: true, message: `Complaint '${description}' added with ID ${newTask.id}.`, taskId: newTask.id };
    },
    updateTask: (taskId: number, status?: TaskStatus, assignedTo?: string) => {
        let taskExists = false;
        let updateApplied = false;
        setTasks(prev => 
            prev.map(task => {
                if (task.id === taskId) {
                    taskExists = true;
                    if (status || assignedTo) {
                       updateApplied = true;
                       return { 
                           ...task, 
                           status: status || task.status, 
                           assignedTo: assignedTo || task.assignedTo 
                       };
                    }
                }
                return task;
            })
        );
        if (!taskExists) {
            return { success: false, message: `Task with ID ${taskId} not found.` };
        }
        if (!updateApplied) {
            return { success: false, message: `No updates provided for task ID ${taskId}.` };
        }
        return { success: true, message: `Task ID ${taskId} has been updated.` };
    },
    deleteTask: (taskId: number) => {
        let taskExists = false;
        setTasks(prev => {
            const newTasks = prev.filter(task => {
                if (task.id === taskId) {
                    taskExists = true;
                    return false;
                }
                return true;
            });
            return newTasks;
        });

        if (!taskExists) {
            return { success: false, message: `Task with ID ${taskId} not found.` };
        }
        return { success: true, message: `Task ID ${taskId} has been deleted.` };
    },
    getTasks: (status?: TaskStatus) => {
        if (status) {
            return tasks.filter(task => task.status === status);
        }
        return tasks;
    },
    createGoogleSheetForTask: (taskId: number) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            return { success: false, message: `Task with ID ${taskId} not found.` };
        }
        
        const htmlContent = generateStyledHtmlForTasks([task], `Details for Task ID: ${taskId}`);
        downloadStyledSheet(htmlContent, `task-${task.id}-details.xls`);
        
        return { success: true, message: `A styled spreadsheet for task ${taskId} has been downloaded.` };
    },
    createGoogleSheetForAllTasks: () => {
        if (tasks.length === 0) {
            return { success: false, message: "There are no tasks to export." };
        }
        
        const htmlContent = generateStyledHtmlForTasks(tasks, 'All Tasks Report');
        downloadStyledSheet(htmlContent, 'all-tasks-report.xls');
        
        return { success: true, message: `A styled spreadsheet with all ${tasks.length} tasks has been downloaded.` };
    }
  };

  const chatHistoryForDisplay: ChatMessage[] = useMemo(() => {
    return conversationHistory
      .map(turn => {
        if (turn.role === 'user') {
          const text = (turn.parts[0] as { text: string }).text;
          return { sender: 'user', text } as ChatMessage;
        }
        if (turn.role === 'model') {
          const textPart = turn.parts.find(part => 'text' in part) as { text: string } | undefined;
          if (textPart) {
            return { sender: 'ai', text: textPart.text };
          }
        }
        return null;
      })
      .filter((msg): msg is ChatMessage => msg !== null);
  }, [conversationHistory]);


  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);
    const userMessage: Content = { role: 'user', parts: [{ text: message }] };
    const historyWithUserMessage = [...conversationHistory, userMessage];
    setConversationHistory(historyWithUserMessage);
    
    try {
      let currentTurnHistory = [...historyWithUserMessage];
      let response = await callGeminiApi(currentTurnHistory);

      let modelResponseParts: Part[] = response.candidates?.[0]?.content?.parts || [];
      const modelResponse: Content = { role: 'model', parts: modelResponseParts };
      currentTurnHistory.push(modelResponse);

      if (response.functionCalls) {
        const fc = response.functionCalls[0] as FunctionCall;
        const functionToCall = functions[fc.name];

        if (functionToCall) {
          const result = await Promise.resolve(functionToCall(...Object.values(fc.args)));
          
          const functionResponse: Content = {
            role: 'tool',
            parts: [{ functionResponse: { name: fc.name, response: result } }]
          };
          currentTurnHistory.push(functionResponse);

          const finalApiResponse = await callGeminiApi(currentTurnHistory);
          let finalModelResponseParts: Part[] = finalApiResponse.candidates?.[0]?.content?.parts || [];
          const finalModelResponse: Content = { role: 'model', parts: finalModelResponseParts };
          currentTurnHistory.push(finalModelResponse);
        } else {
          throw new Error(`Function ${fc.name} not found.`);
        }
      }
      
      setConversationHistory(currentTurnHistory);

    } catch (error) {
      console.error('Error in conversation flow:', error);
      const errorMessage: Content = { role: 'model', parts: [{ text: 'Sorry, I encountered an error. Please try again.' }] };
      setConversationHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationHistory, tasks]);

  return (
    <div className="flex h-screen font-sans text-gray-800 bg-gray-50">
      <main className="flex-1 p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto">
        <div className="lg:col-span-2">
          <Dashboard tasks={tasks} />
        </div>
        <div className="lg:col-span-1 flex flex-col h-full max-h-screen">
          <ChatInterface
            chatHistory={chatHistoryForDisplay}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  );
};

export default App;