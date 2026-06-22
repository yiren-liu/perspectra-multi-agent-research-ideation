import { Button } from "./button";
import { useApi } from "@/controller/API";
import { useTaskProgress } from "@/hooks/use-task-progress";
import { ProgressUpdateChunk } from "@/types";
import { createProgressTask } from "./progress-panel";

export function DemoProgressPanel() {
  const api = useApi();
  const { createAndMonitorTask } = useTaskProgress();
  
  const handleTestProgress = async () => {
    // Create a progress task
    const progressTask = createProgressTask("Demo Task");
    
    // Start the task
    progressTask.start();
    
    try {
      // Start the progress stream
      await api.testTaskProgress(
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
        }
      );
    } catch (error) {
      progressTask.error(`Failed: ${error}`);
    }
  };
  
  const handleSimulateMultipleTasks = () => {
    // Simulate starting 3 different tasks with different completion times
    
    // Task 1: Quick task
    const task1 = createProgressTask("Quick Task");
    task1.start();
    let progress1 = 0;
    const interval1 = setInterval(() => {
      progress1 += 20;
      task1.updateProgress(progress1, `Step ${progress1/20} of 5`);
      if (progress1 >= 100) {
        task1.complete("Completed quickly!");
        clearInterval(interval1);
      }
    }, 500);
    
    // Task 2: Medium task
    const task2 = createProgressTask("Medium Task");
    task2.start();
    let progress2 = 0;
    const interval2 = setInterval(() => {
      progress2 += 10;
      task2.updateProgress(progress2, `Processing step ${progress2/10}`);
      if (progress2 >= 100) {
        task2.complete("Medium task completed");
        clearInterval(interval2);
      }
    }, 800);
    
    // Task 3: Slow task that errors
    const task3 = createProgressTask("Problematic Task");
    task3.start();
    let progress3 = 0;
    const interval3 = setInterval(() => {
      progress3 += 15;
      task3.updateProgress(progress3, `Working on complex operation`);
      if (progress3 >= 60) {
        task3.error("Failed due to timeout");
        clearInterval(interval3);
      }
    }, 1000);
  };
  
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-medium">Progress Panel Demo</h2>
      <div className="flex space-x-2">
        <Button onClick={handleTestProgress}>
          Test Backend Progress
        </Button>
        <Button variant="outline" onClick={handleSimulateMultipleTasks}>
          Simulate Multiple Tasks
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Click the buttons above to see the progress panel in action. The panel will appear at the bottom left of the screen.
      </p>
    </div>
  );
} 