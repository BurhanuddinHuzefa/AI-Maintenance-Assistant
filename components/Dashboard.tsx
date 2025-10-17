
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus } from '../types';
import { TaskCard } from './TaskCard';

interface DashboardProps {
  tasks: Task[];
}

type FilterType = TaskStatus | 'All';

export const Dashboard: React.FC<DashboardProps> = ({ tasks }) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

  const filteredTasks = useMemo(() => {
    if (activeFilter === 'All') {
      return tasks;
    }
    return tasks.filter(task => task.status === activeFilter);
  }, [tasks, activeFilter]);

  const FilterButton: React.FC<{ filter: FilterType; label: string }> = ({ filter, label }) => {
    const isActive = activeFilter === filter;
    return (
      <button
        onClick={() => setActiveFilter(filter)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-blue-600 text-white shadow'
            : 'bg-white text-gray-600 hover:bg-gray-100'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Maintenance Dashboard</h1>
        <div className="flex space-x-2 p-1 bg-gray-200 rounded-lg">
          <FilterButton filter="All" label="All" />
          <FilterButton filter={TaskStatus.Pending} label="Pending" />
          <FilterButton filter={TaskStatus.InProgress} label="In Progress" />
          <FilterButton filter={TaskStatus.Completed} label="Completed" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        {filteredTasks.length > 0 ? (
          <div className="space-y-4">
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No tasks found for this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
