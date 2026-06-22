import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { Button } from "./button";
import { Progress } from "./progress";
import { ScrollArea } from "./scroll-area";

// Define a task type
export type ProgressTask = {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "error";
  progress: number;
  message?: string;
  createdAt: Date;
};

// Create a store for progress tasks
type ProgressStore = {
  tasks: Record<string, ProgressTask>;
  addTask: (task: ProgressTask) => void;
  updateTask: (id: string, updates: Partial<ProgressTask>) => void;
  removeTask: (id: string) => void;
};

export const useProgressStore = create<ProgressStore>((set) => ({
  tasks: {},
  addTask: (task) => 
    set((state) => ({ 
      tasks: { ...state.tasks, [task.id]: task } 
    })),
  updateTask: (id, updates) => 
    set((state) => ({ 
      tasks: { 
        ...state.tasks, 
        [id]: { ...state.tasks[id], ...updates } 
      } 
    })),
  removeTask: (id) => 
    set((state) => {
      const newTasks = { ...state.tasks };
      delete newTasks[id];
      return { tasks: newTasks };
    }),
}));

export function ProgressPanel() {
  const [isMinimized, setIsMinimized] = useState(false);
  const { tasks, removeTask } = useProgressStore();
  const taskList = Object.values(tasks).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  
  const activeTasks = taskList.filter(
    (task) => task.status === "pending" || task.status === "running"
  );
  
  const hasActiveTasks = activeTasks.length > 0;

  // Hide the panel completely if no tasks
  if (taskList.length === 0) return null;

  return (
    <div 
      className={`fixed bottom-4 left-4 z-50 bg-card rounded-md shadow-lg border transition-all duration-200 w-80 ${
        isMinimized ? "h-12" : hasActiveTasks ? "h-64" : "h-48"
      }`}
    >
      <div className="flex justify-between items-center p-3 border-b">
        <h3 className="text-sm font-medium flex items-center gap-2">
          {hasActiveTasks && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
          Tasks {activeTasks.length > 0 && `(${activeTasks.length} active)`}
        </h3>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0" 
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? "+" : "-"}
          </Button>
        </div>
      </div>
      
      {!isMinimized && (
        <ScrollArea className="p-3 h-[calc(100%-44px)]">
          <div className="space-y-3">
            {taskList.map((task) => (
              <div key={task.id} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium truncate mr-2">{task.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {task.status === "running" ? "Running" : 
                       task.status === "completed" ? "Completed" :
                       task.status === "error" ? "Error" : "Pending"}
                    </span>
                    {(task.status === "completed" || task.status === "error") && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 w-5 p-0" 
                        onClick={() => removeTask(task.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <Progress 
                  value={task.progress} 
                  className={
                    task.status === "completed" ? "bg-green-200" : 
                    task.status === "error" ? "bg-red-200" : ""
                  }
                  indicatorClassName={
                    task.status === "completed" ? "bg-green-500" : 
                    task.status === "error" ? "bg-red-500" : ""
                  }
                />
                
                {task.message && (
                  <p className="text-xs text-muted-foreground mt-1">{task.message}</p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// Utility function to add a new task and get functions to update its progress
export function createProgressTask(name: string) {
  const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { addTask, updateTask, removeTask } = useProgressStore.getState();
  
  addTask({
    id: taskId,
    name,
    status: "pending",
    progress: 0,
    createdAt: new Date(),
  });
  
  return {
    taskId,
    start: () => updateTask(taskId, { status: "running" }),
    updateProgress: (progress: number, message?: string) => 
      updateTask(taskId, { progress, message }),
    complete: (message?: string) => 
      updateTask(taskId, { status: "completed", progress: 100, message }),
    error: (message?: string) => 
      updateTask(taskId, { status: "error", message }),
    remove: () => removeTask(taskId),
  };
} 