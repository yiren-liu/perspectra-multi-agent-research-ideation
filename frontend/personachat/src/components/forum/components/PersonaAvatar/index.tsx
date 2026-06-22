import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEffect, useState } from "react"
import { useApi } from "@/controller/API"
import type { Persona } from "@/types"
import { useUserStudyLogger } from "@/utils/userStudyLogger"
import { useAppStore } from "@/stores/appStore"

interface PersonaAvatarProps {
  persona: {
    id: string
    name: string
    avatar: string
  }
}

export function PersonaAvatar({ persona }: PersonaAvatarProps) {

  // const [personaProfile, setPersonaProfile] = useState<any>(null);
  // const { getPersonaProfile } = useApi();
  const { setIsShowingPersonaProfile, isShowingPersonaProfile, setSelectedPersonaId, selectedPersonaId, setCurrentPanel, currentProjectId } = useAppStore();
  const logger = useUserStudyLogger();
  const handleTogglePersonaProfile = () => {
    if (isShowingPersonaProfile) {
      if (selectedPersonaId === persona.id) {
        setIsShowingPersonaProfile(false);
        setSelectedPersonaId(null);
      } else {
        setSelectedPersonaId(persona.id);
        setCurrentPanel('literature');
        logger.logInteraction('click', 'view-persona-profile-avatar', {
          persona_id: persona.id,
          persona_name: persona.name,
          project_id: currentProjectId || 'none'
        });
      }
    } else {
      setIsShowingPersonaProfile(!isShowingPersonaProfile);
      setSelectedPersonaId(persona.id);
      logger.logInteraction('click', 'view-persona-profile-avatar', {
        persona_id: persona.id,
        persona_name: persona.name,
        project_id: currentProjectId || 'none'
      });
    }
  }

  // useEffect(() => {
  //   getPersonaProfile(persona.name).then((res) => {
  //     setPersonaProfile(res.data.persona_profile);
  //   });
  // }, [persona.name]); 

  return (
    <Avatar className="w-10 h-10 hover:cursor-pointer" onClick={handleTogglePersonaProfile}>
      <AvatarImage src={persona.avatar} alt={persona.name} />
      <AvatarFallback>{persona.name.charAt(0)}</AvatarFallback>
    </Avatar>
  )
}

