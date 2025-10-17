
export enum TaskStatus {
  Pending = 'Pending',
  InProgress = 'In Progress',
  Completed = 'Completed',
}

export interface Task {
  id: number;
  description: string;
  status: TaskStatus;
  assignedTo: string;
  date: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}
