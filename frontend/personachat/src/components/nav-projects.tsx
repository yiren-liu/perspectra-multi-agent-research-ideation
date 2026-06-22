import { useEffect, useState, FormEvent } from "react"
import { PlusIcon, ChevronRightIcon, Pencil2Icon, CrossCircledIcon, CheckIcon } from "@radix-ui/react-icons"
import { 
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Project, useAppStore } from "@/stores/appStore"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { Folders, FolderOpen, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "./ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useUserStudyLogger } from "@/utils/userStudyLogger"
import { useApi } from "@/controller/API"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

export function NavProjects() {
  const { 
    projects, 
    addProject, 
    deleteProject, 
    selectedProjectId, 
    setSelectedProjectId,
    threadProjectMap,
    threads,
    addThreadToProject,
    getThreadsForProject,
    getSelectedProject,
  } = useAppStore();
  
  const logger = useUserStudyLogger();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectEmoji, setNewProjectEmoji] = useState("📋");
  const [error, setError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editedProjectName, setEditedProjectName] = useState("");

  // Suggested emoji options
  const emojiOptions = ["📋", "📑", "📚", "🔬", "💡", "🧪", "🔭", "📊", "📝", "🧠"];

  // Fetch projects on component mount
  useEffect(() => {
    /* getProjects().then((response) => {
      // Parse response and set projects
    }); */
  }, []);

  const handleSelectProject = async (id: string) => {
    // Log the project selection
    logger.logInteraction('click', 'select-project', {
      previous_project_id: selectedProjectId || 'none',
      new_project_id: id,
      project_name: projects.find(p => p.id === id)?.name || 'All Projects'
    });
    
    setSelectedProjectId(id);
  };

  const handleSelectAllProjects = async () => {
    // Log when user selects "All Projects"
    logger.logInteraction('click', 'select-all-projects', {
      previous_project_id: selectedProjectId || 'none'
    });
    
    setSelectedProjectId('all');
  };

  const handleCreateProject = (e: FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setError("Project name is required");
      return;
    }

    // Generate a unique ID based on name
    const id = newProjectName.toLowerCase().replace(/\s+/g, '-');
    
    // Check if project with this ID already exists
    if (projects.some(p => p.id === id)) {
      setError("A project with this name already exists");
      return;
    }

    // Create the new project
    const newProject: Project = {
      id,
      name: newProjectName,
      description: newProjectDesc,
      emoji: newProjectEmoji,
      createdAt: new Date()
    };

    addProject(newProject);
    setSelectedProjectId(id);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewProjectName("");
    setNewProjectDesc("");
    setNewProjectEmoji("📋");
    setError(null);
  };

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    // Log the delete project action
    logger.logInteraction('click', 'delete-project-button', {
      project_id: projectId,
      project_name: project.name,
      thread_count: getProjectThreadCount(projectId)
    });
    
    // Set the project to delete
    setProjectToDelete(projectId);
    // Open confirmation dialog
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    const project = projects.find(p => p.id === projectToDelete);
    if (!project) return;
    
    try {
      // Log the confirmed deletion
      logger.logFeatureUsage('project-deletion', 'confirmed', {
        project_id: projectToDelete,
        project_name: project.name,
        thread_count: getProjectThreadCount(projectToDelete)
      });
      
      // Delete the project
      deleteProject(projectToDelete);
      
      // If we're currently viewing this project, switch to All Projects
      if (selectedProjectId === projectToDelete) {
        setSelectedProjectId('all');
      }
      
      // Close dialog and reset
      setIsDeleteConfirmOpen(false);
      setProjectToDelete(null);
      
      toast({
        title: "Project deleted",
        description: `${project.name} has been deleted.`
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      
      // Log the error
      logger.logFeatureUsage('project-deletion', 'error', {
        project_id: projectToDelete,
        project_name: project.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete project"
      });
    }
  };

  const getProjectThreadCount = (projectId: string) => {
    if (projectId === 'all') {
      return threads.length;
    }
    
    const threadsForProject = getThreadsForProject(projectId);
    return threadsForProject.length;
  };

  const handleEditProjectName = (projectId: string, projectName: string) => {
    if (projectId === 'default') return; // Don't allow editing default project
    setEditingProjectId(projectId);
    setEditedProjectName(projectName);
  };

  const saveProjectName = (projectId: string) => {
    if (!editedProjectName.trim()) {
      setError("Project name cannot be empty");
      return;
    }

    // Update in the store
    useAppStore.getState().updateProject(projectId, { name: editedProjectName });
      
    // Exit edit mode
    setEditingProjectId(null);
    setEditedProjectName("");
  };

  const cancelEditing = () => {
    setEditingProjectId(null);
    setEditedProjectName("");
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex justify-between items-center">
        Projects
        <Button className="h-7 w-7" variant="outline" size="icon" onClick={() => setIsCreateDialogOpen(true)}>
          <PlusIcon className="w-5 h-5" />
        </Button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {/* Special "All Projects" item */}
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              isActive={selectedProjectId === 'all'}
              onClick={handleSelectAllProjects}
            >
              <div className="flex items-center w-full">
                <span className="mr-2">🗂️</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate">All Projects</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      All Projects
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="ml-auto flex-shrink-0 text-xs bg-secondary px-2 py-0.5 rounded-full">
                  {threads.length}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* List of projects */}
          {projects.map((project) => (
            <SidebarMenuItem key={project.id}>
              <SidebarMenuButton 
                asChild 
                isActive={selectedProjectId === project.id}
                onClick={() => handleSelectProject(project.id)}
              >
                <div className="flex items-center w-full">
                  <span className="mr-2 flex-shrink-0">{project.emoji}</span>
                  
                  {editingProjectId === project.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        className="h-7 py-1 px-2"
                        value={editedProjectName}
                        onChange={(e) => setEditedProjectName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveProjectName(project.id);
                          } else if (e.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0" 
                        onClick={() => saveProjectName(project.id)}
                        title="Save"
                      >
                        <CheckIcon className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"  
                        className="h-6 w-6 p-0" 
                        onClick={cancelEditing}
                        title="Cancel"
                      >
                        <CrossCircledIcon className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span 
                            className="truncate overflow-hidden text-ellipsis cursor-text pr-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (project.id !== 'default') {
                                handleEditProjectName(project.id, project.name);
                              }
                            }}
                          >
                            {project.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {project.name}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  <span className="ml-auto flex-shrink-0 text-xs bg-secondary px-2 py-0.5 rounded-full">
                    {getProjectThreadCount(project.id)}
                  </span>
                </div>
              </SidebarMenuButton>
              {project.id !== 'default' && (
                <SidebarMenuAction 
                  showOnHover 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </SidebarMenuAction>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your discussion threads
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateProject}>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Project Name</label>
              <Input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <Textarea
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Enter project description"
                className="w-full"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Project Icon</label>
              <div className="flex gap-2 flex-wrap">
                {emojiOptions.map(emoji => (
                  <Button
                    key={emoji}
                    type="button"
                    variant={newProjectEmoji === emoji ? "default" : "outline"}
                    onClick={() => setNewProjectEmoji(emoji)}
                    className="h-10 w-10"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Create Project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? All threads will be moved to the Default Project.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteProject}>
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarGroup>
  )
} 