import { useApi } from "@/controller/API";
import { createProgressTask } from "@/components/ui/progress-panel";
import { Paper, ProgressUpdateChunk } from "@/types";
import { useCallback } from "react";

/**
 * Hook for managing task progress with the progress panel
 */
export function useTaskProgress() {
  const api = useApi();
  
  /**
   * Function to add papers to RAG with progress tracking
   */
  const addPapersWithProgress = useCallback(async (papers: Paper[], name: string = "Adding papers to RAG") => {
    // Create a progress task
    const progressTask = createProgressTask(name);
    
    // Start the task
    progressTask.start();
    
    try {
      // Monitor the progress stream
      await api.monitorAddPapersProgress(
        { papers },
        (chunk: ProgressUpdateChunk) => {
          // Update progress based on streaming updates
          progressTask.updateProgress(
            chunk.data.progress, 
            chunk.data.message
          );
          
          // If completed or error, update task status
          if (chunk.data.status === "completed") {
            progressTask.complete(chunk.data.message);
          } else if (chunk.data.status === "error") {
            progressTask.error(chunk.data.message);
          }
        },
        (error) => {
          progressTask.error(`Error: ${error}`);
        },
        () => {
          // This is called when the stream ends
          // Only mark complete if not already marked complete or error
        }
      );
      
      return true;
    } catch (error) {
      progressTask.error(`Failed to add papers: ${error}`);
      return false;
    }
  }, [api]);
  
  /**
   * Function to create and monitor a custom task
   */
  const createAndMonitorTask = useCallback(async (
    taskName: string,
    taskId: string = `task-${Date.now()}`,
    taskType: string,
    data: any,
    onComplete?: () => void
  ) => {
    // Create a progress task
    const progressTask = createProgressTask(taskName);
    
    // Start the task
    progressTask.start();
    
    try {
      // Monitor the progress stream
      await api.streamTaskProgress(
        taskId,
        taskName,
        taskType,
        data,
        (chunk: ProgressUpdateChunk) => {
          // Update progress based on streaming updates
          progressTask.updateProgress(
            chunk.data.progress, 
            chunk.data.message
          );
          
          // If completed or error, update task status
          if (chunk.data.status === "completed") {
            progressTask.complete(chunk.data.message);
            onComplete?.();
          } else if (chunk.data.status === "error") {
            progressTask.error(chunk.data.message);
          }
        },
        (error) => {
          progressTask.error(`Error: ${error}`);
        }
      );
      
      return true;
    } catch (error) {
      progressTask.error(`Failed task: ${error}`);
      return false;
    }
  }, [api]);

  return {
    addPapersWithProgress,
    createAndMonitorTask
  };
} 