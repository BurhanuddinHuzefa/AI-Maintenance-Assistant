
import React from 'react';
import { Task, TaskStatus } from '../types';

interface TaskCardProps {
  task: Task;
}

const statusColors: { [key in TaskStatus]: { bg: string; text: string; dot: string } } = {
  [TaskStatus.Pending]: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  [TaskStatus.InProgress]: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  [TaskStatus.Completed]: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
};

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { bg, text, dot } = statusColors[task.status];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start">
        <p className="text-base font-semibold text-gray-800 flex-1 pr-4">{task.description}</p>
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
          <span className={`w-2 h-2 mr-1.5 rounded-full ${dot}`}></span>
          {task.status}
        </div>
      </div>
      <div className="mt-3 flex justify-between items-center text-sm text-gray-500">
        <p>
          <span className="font-medium">ID:</span> {task.id} | <span className="font-medium">Assigned:</span> {task.assignedTo}
        </p>
        <p>{task.date}</p>
      </div>
    </div>
  );
};
