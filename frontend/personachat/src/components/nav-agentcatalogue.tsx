import { useState } from "react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from "@/components/ui/collapsible"
  import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
  } from "@/components/ui/sidebar"
  import { ChevronRightIcon, DotsHorizontalIcon, PlusIcon } from "@radix-ui/react-icons"
  import { SettingsIcon } from "lucide-react"

  import { AgentInfo } from "@/types"

  import { useAppStore } from "@/stores/appStore"
  import { Button } from "@/components/ui/button"

  import { PersonaProfileDialog } from "@/components/personaPanel"
  
  export function NavAgentCatalogue({
    agentCatalog,
  }: {
    agentCatalog: AgentInfo[]
  }) {
    // State to track whether the full catalogue is displayed
    const [expandedCatalogue, setExpandedCatalogue] = useState(false)
    const PREVIEW_COUNT = 3
    const visibleAgents = expandedCatalogue ? agentCatalog : agentCatalog.slice(0, PREVIEW_COUNT)
    const { personaProfileTemplate, fullPersonaProfileTemplate, setIsShowingPersonaProfileDialog, setSelectedPersonaId } = useAppStore()


    return (
      <SidebarGroup>
        <SidebarGroupLabel className="flex justify-between items-center">
          Agent Catalog
          <Button className="h-7 w-7" variant="outline" size="icon" onClick={() => {
            setIsShowingPersonaProfileDialog(true);
          }}>
            <PlusIcon className="w-5 h-5" />
          </Button>
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visibleAgents.map((agent) => (
              <Collapsible key={agent.name}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="#">
                      <span>{agent.name}</span>
                    </a>
                  </SidebarMenuButton>
                  {/* <CollapsibleTrigger asChild>
                    <SidebarMenuAction
                      className="left-2 bg-sidebar-accent text-sidebar-accent-foreground data-[state=open]:rotate-90"
                      showOnHover
                    >
                      <ChevronRightIcon />
                    </SidebarMenuAction>
                  </CollapsibleTrigger> */}
                  <SidebarMenuAction showOnHover>
                    <SettingsIcon onClick={
                      () => {
                        setSelectedPersonaId(agent.name)
                        setIsShowingPersonaProfileDialog(true)
                      }
                    }/>
                  </SidebarMenuAction>
                  {/* <CollapsibleContent>
                    <SidebarMenuSub>
                      {agent.paper_ids.map((paper_id) => (
                        <SidebarMenuSubItem key={paper_id}>
                          <SidebarMenuSubButton asChild>
                            <a href="#">
                              <span>{paper_id}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent> */}
                </SidebarMenuItem>
              </Collapsible>
            ))}

            {/* Conditionally render the "More" button if not expanded */}
            {!expandedCatalogue && agentCatalog.length > PREVIEW_COUNT && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="text-sidebar-foreground/70"
                  onClick={() => setExpandedCatalogue(true)}
                >
                  <DotsHorizontalIcon />
                  <span>More</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Conditionally render the "Collapse Catalogue" button if expanded */}
            {expandedCatalogue && agentCatalog.length > PREVIEW_COUNT && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="text-sidebar-foreground/70"
                  onClick={() => setExpandedCatalogue(false)}
                >
                  <DotsHorizontalIcon />
                  <span>Collapse Catalogue</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
          <PersonaProfileDialog />
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }
  