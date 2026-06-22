import { useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Edit, Trash } from "lucide-react"
import { AgentInfo, AgentResponsePeekerData } from "@/types"
import { PersonaAvatar } from "@/components/forum/components/PersonaAvatar"
import { useAppStore } from "@/stores/appStore";

// New imports for dropdown menu functionality
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { replacePaperIdWithCitation } from "@/components/forum/components/ForumThread/utils";

interface AgentResponsePeekerProps {
  agentResponsePeekerData: AgentResponsePeekerData;
  setAgentResponsePeekerData: (data: AgentResponsePeekerData | null) => void;
  threadId: string;
  parentMessageId: string;
  onAgentOrActionChange: (action: string, agent: AgentInfo) => Promise<void>;
  onCancel: () => void;
}

function AgentResponsePeeker({ agentResponsePeekerData, setAgentResponsePeekerData, threadId, parentMessageId, onAgentOrActionChange, onCancel }: AgentResponsePeekerProps) {
  const { addReply, agentActions, agentCatalog, getAgentInfoByName, addCitationsToThread } = useAppStore();
  const [selectedAction, setSelectedAction] = useState<string>(agentResponsePeekerData.agent_response.chosen_action);
  const [selectedAgentName, setSelectedAgentName] = useState<string>(agentResponsePeekerData.agent.name);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleAgentOrActionChange = async () => {
    setIsLoading(true);
    const agent = getAgentInfoByName(selectedAgentName);
    if (!agent) {
      console.error(`Agent with name ${selectedAgentName} not found`);
      return;
    }
    await onAgentOrActionChange(selectedAction, agent);
    setIsLoading(false);
  }

  
  if (!isVisible) return null;

  return (
    <Card className="my-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Agent Response Preview</CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
          <Trash className="h-5 w-5 text-red-500" />
          <span className="sr-only">Delete response</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-start gap-4">
            <PersonaAvatar
              persona={{ id: agentResponsePeekerData.agent.name, name: agentResponsePeekerData.agent.name, avatar: "" }}
            />
            <div className="flex-1">
              <div className="flex items-center mb-2 gap-2">
                <h3 className="text-lg font-semibold">{selectedAgentName}</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Edit className="h-5 w-5 text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="start">
                    <ScrollArea className="h-64">
                      {agentCatalog && agentCatalog.length > 0 ? (
                        agentCatalog.map((agent) => (
                          <DropdownMenuItem
                            key={agent.name}
                            onClick={() => {
                              setSelectedAgentName(agent.name);
                              handleAgentOrActionChange();
                            }}
                          >
                            {agent.name}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>No Agents Available Yet</DropdownMenuItem>
                      )}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                {selectedAction}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Edit className="h-5 w-5 text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="start">
                    <ScrollArea>
                      {agentActions && agentActions.length > 0 ? (
                        agentActions.map((action) => (
                          <DropdownMenuItem
                            key={action.action}
                            onClick={() => {
                              setSelectedAction(action.action);
                              handleAgentOrActionChange();
                            }}
                          >
                            {action.action}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>No Actions Available Yet</DropdownMenuItem>
                      )}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              ) : (
                <p className="text-gray-800">{replacePaperIdWithCitation(agentResponsePeekerData.agent_response.next_response.content, agentResponsePeekerData.agent_response.citations)}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button className="ml-2" onClick={() => {
          addReply(threadId, parentMessageId, {
            content: agentResponsePeekerData.agent_response.next_response.content,
            author: selectedAgentName,
            id: uuidv4(),
            chosen_action: selectedAction,
            reason: agentResponsePeekerData.agent_response.reason,
            multi_level_summary: agentResponsePeekerData.agent_response.multi_level_summary
          });
          addCitationsToThread(threadId, agentResponsePeekerData.agent_response.citations);
          setIsVisible(false);
          setAgentResponsePeekerData(null);
        }}>Post</Button>
      </CardFooter>
    </Card>
  )
}

export default AgentResponsePeeker;