import * as React from "react"
import {
  AudioWaveform,
  Blocks,
  Calendar,
  Command,
  Home,
  Inbox,
  MessageCircleQuestion,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react"

import { NavFavorites } from "@/components/nav-favorites"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavWorkspaces } from "@/components/nav-workspaces"
import { NavAgentCatalogue } from "@/components/nav-agentcatalogue"
import { NavProjects } from "@/components/nav-projects"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavUser } from "./nav-user"
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from "@/stores/authStore"
import { useEffect, useState } from "react"
import { useUserStudyLogger } from "@/utils/userStudyLogger"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { agentCatalog, isShowingMindMap, setIsShowingMindMap } = useAppStore();
  const { getCurrentUser } = useAuthStore();
  const logger = useUserStudyLogger();
  
  const data = {
    // Instead of "Teams," we might think of these as "Persona Panels" or "Expert Panels."
    // You can rename them as needed. For each "team," you could store info about that panel's role or domain.
    teams: [
    ],
  
    // Main navigation might guide the user to create new topics, view ongoing discussions, etc.
    navMain: [
      {
        title: "Visualize Mind-Map",
        url: "#",
        icon: Search,
        isActive: isShowingMindMap,
        onClick: async () => {
          // Log the mind map toggle interaction
          logger.logInteraction('click', 'toggle-mind-map', {
            previous_state: isShowingMindMap ? 'visible' : 'hidden',
            new_state: isShowingMindMap ? 'hidden' : 'visible'
          });
          
          setIsShowingMindMap(!isShowingMindMap);
        },
      }
    ],
  
    // Secondary nav might contain less-frequent actions or advanced settings.
    navSecondary: [
      {
        title: "Settings",
        url: "#",
        icon: Settings2,
      }
    ],
  
    // "Favorites" could be a place to store the user's pinned topics, interesting papers, or
    // persona profiles they frequently refer to.
    favorites: [
    ],
  
    workspaces: [
      // {
      //   name: "User-Created Personas",
      //   emoji: "👤",
      //   pages: [
      //     {
      //       name: "My Healthcare Expert Persona",
      //       url: "#",
      //       emoji: "👩‍⚕️",
      //     },
      //     {
      //       name: "My Data Scientist Persona",
      //       url: "#",
      //       emoji: "👨‍💻",
      //     },
      //   ],
      // },
    ],
    // Default user info - we'll replace this with data from Supabase
    user: {
      name: "Default User",
      email: "default@example.com",
      avatar: "/avatars/default.jpg",
    },
  }

  const [userInfo, setUserInfo] = useState(data.user);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserInfo({
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            avatar: user.user_metadata?.avatar_url || '/avatars/default.jpg',
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserInfo();
  }, [getCurrentUser]);

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        {/* <TeamSwitcher teams={data.teams} /> */}
        <NavMain items={data.navMain} />
      </SidebarHeader>

      <SidebarContent>
        {/* <NavFavorites favorites={data.favorites} /> */}

        {/* Add Projects section here */}
        <NavProjects />

        {/* <NavWorkspaces workspaces={data.workspaces} /> */}

        {/* Add Agent Catalog here */}
        <div className="mt-4">
          <NavAgentCatalogue agentCatalog={agentCatalog} />
        </div>

        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarRail />

      <SidebarFooter>
        <NavUser user={userInfo} />
      </SidebarFooter>
    </Sidebar>
  )
}
