export type Paper = {
  id: string
  title: string
  authors: string[]
  abstract: string
  year: number
  url: string
  topic: string
  venue: string
  citationCount: string
}

export type Persona = {
  id: string;
  name: string;
  avatar: string;
  personaDescription: {
    domainAndFocus: {
      levelOfExpertise: string;
      researchArea: string;
      researchInterests: string;
      specializationsAndSubfields: {
        geographicalExpertise: string;
        culturalExpertise: string;
        researchContextAndSetting: string;
        audienceDemographics: string;
      };
      temporalShiftInResearchFocus: string;
      preferredPublicationChannels: string;
    };
    expertiseTraits: {
      applicationAreas: string;
      domainKnowledge: string;
      professionalDomain: string;
      analyticalAndMethodologicalFramework: {
        researchMethodology: string;
        technicalSkills: string;
        analyticalSkills: string;
        theoreticalFrameworksAndApproaches: string;
      };
      impactAndInfluences: string;
    };
    characteristics: {
      personalityTraits: string;
      behavioralPatterns: string;
      cognitiveStyles: {
        problemSolvingStyle: string;
        decisionMakingStyle: string;
        complexityTolerance: string;
      };
      socioEmotionalAttributes: {
        emotionalIntelligence: string;
        communicationStyle: string;
        writingStyleAndTone: string;
        interpersonalSkills: string;
      };
      personalValuesAndGoals: {
        coreValues: string;
        objectivesAndGoals: string;
        challenges: string;
      };
    };
    professionalProfile: {
      workContextAndEnvironment: string;
      professionalSkills: string;
      workStyle: string;
      responsibilities: string;
      roleAndTitle: string;
      backgroundAndExperience: string;
      careerDevelopment: string;
    };
    educationalAndTeachingDynamics: {
      educationalLevel: string;
      teachingAndLearningMethods: {
        instructionalStyleAndApproach: string;
        preferredLearningStyles: string;
        curriculumDevelopmentAndFocus: string;
      };
    };
  };
};

export type PersonaTraits = {
  [key: string]: string | { [key: string]: string }
}

export type PersonaTraitEdit = {
  [key: string]: {
    path: string[];
    old_value: string;
    new_value: string;
  }
}

export type GraphData = {
  nodes: { id: string, name: string }[]
  links: { source: string, target: string }[]
}

export type LRTableCellData = {
  gist: string;
  references: string[];
  persona: string;
};
export type LRTableColumnData = {
  column_names: string[];
  persona: string;
}
export type LRTableData = {
  scheme: Map<string, LRTableColumnData>
  table_values: Map<string, LRTableCellData>[]
}
export type TableOfContents = {
  table_of_contents: { topic: string, perspectives: { persona_id: string, perspective: string }[] }[]
}

export type ChatMessage = {
  sender_name: string;
  sender_avatar: string;
  message: string;
}
export type ChatMessageChunkStreaming = {
  source: string;
  models_usage: Map<string, number>;
  content: string;
}
export type ChatMessageChunkStreamingWithCitation = {
  chat_message: ChatMessageChunkStreaming;
  citations: Citation[];
}
export type ConceptSource = {
  concept: string;
  sources: string[];
}

export type ForumThreadTopic = {
  topic: string;
  topic_description: string;
}
export type ForumThread = {
  discussion: {
    id: string;
    topic: string;
    topic_description: string;
    discussion_thread: {
      message: Message;
      replies: {
        message: Message;
        replies: any[];
      }[];
    }[];
  };
  citations: {
    paper_id: string
    title: string
    abstract: string
    authors: string[]
    year: number
    url: string
  }[];
  is_favorited?: boolean;
}
export type ForumThreadChunkStreaming = {
  type: string;
  body: any;
}
export type PersonaLiterature = {
  paperId: string
  title: string
  abstract: string
  authors: string[]
  year: number
  url: string
}

export type AgentInfo = {
  name: string;
  paper_ids: string[];
}

export type Message = {
  id: string
  author: string
  chosen_action: string
  reason: string
  content: string
  multi_level_summary: MultiLevelSummary | null
}
export type MultiLevelSummary = {
  keywords: string[];
  short_summary: string;
  long_summary: string;
}

export type Citation = {
  paper_id: string
  title: string
  abstract: string
  authors: string[]
  year: number
  url: string
}

export interface NextResponse {
  reply_to_msg_id: string;
  content: string;
}
export interface AgentResponse {
  chosen_action: string;
  reason: string;
  next_response: NextResponse;
  citations: Citation[];
  multi_level_summary: MultiLevelSummary | null;
}
export type AgentResponsePeekerData = {
  reply_to_msg_id: string;
  agent_response: AgentResponse;
  agent: AgentInfo;
}


export type PersonaProfileTemplateValue = {
  type: string;
  options?: string[];
}
export type PersonaProfileTemplate = {
  [key: string]: {
    [key: string]: {
      definition: string;
      value: PersonaProfileTemplateValue;
    };
  };
}

// User Study Log Types
export interface UserStudyLog {
  id: number;
  user_id: string;
  session_id: string;
  client_name?: string;
  timestamp: string;
  log_type: string;
  log_data: any;
  created_at: string;
}

// Add BaselineResearchProposal for baseline group chat
export interface BaselineResearchProposal {
  motivation: string;
  pastResearch: string;
  method: string;
  findings: string;
  notes: string;
}

// Progress stream types
export type ProgressUpdateChunk = {
  type: "PROGRESS_UPDATE";
  data: {
    task_id: string;
    task_name: string;
    progress: number;
    status: "pending" | "running" | "completed" | "error";
    message?: string;
  };
}; 
