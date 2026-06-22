from pydantic import BaseModel
from typing import List, Optional

class SpecializationsAndSubfields(BaseModel):
    geographical_expertise: Optional[str]
    cultural_expertise: Optional[str]
    research_context_and_setting: Optional[str]
    audience_demographics: Optional[str]

class AnalyticalAndMethodologicalFramework(BaseModel):
    research_methodology: Optional[str]
    technical_skills: Optional[str]
    analytical_skills: Optional[str]
    theoretical_frameworks_and_approaches: Optional[str]

class CognitiveStyles(BaseModel):
    problem_solving_style: Optional[str]
    decision_making_style: Optional[str]
    complexity_tolerance: Optional[str]

class SocioEmotionalAttributes(BaseModel):
    emotional_intelligence: Optional[str]
    communication_style: Optional[str]
    writing_style_and_tone: Optional[str]
    interpersonal_skills: Optional[str]

class PersonalValuesAndGoals(BaseModel):
    core_values: Optional[str]
    objectives_and_goals: Optional[str]
    challenges: Optional[str]

class DomainAndFocus(BaseModel):
    level_of_expertise: Optional[str]
    research_area: Optional[str]
    research_interests: Optional[str]
    specializations_and_subfields: Optional[SpecializationsAndSubfields]
    temporal_shift_in_research_focus: Optional[str]
    preferred_publication_channels: Optional[str]

class ExpertiseTraits(BaseModel):
    application_areas: Optional[str]
    domain_knowledge: Optional[str]
    professional_domain: Optional[str]
    analytical_and_methodological_framework: Optional[AnalyticalAndMethodologicalFramework]
    impact_and_influences: Optional[str]

class Characteristics(BaseModel):
    personality_traits: Optional[str]
    behavioral_patterns: Optional[str]
    cognitive_styles: Optional[CognitiveStyles]
    socio_emotional_attributes: Optional[SocioEmotionalAttributes]
    personal_values_and_goals: Optional[PersonalValuesAndGoals]

class ProfessionalProfile(BaseModel):
    work_context_and_environment: Optional[str]
    professional_skills: Optional[str]
    work_style: Optional[str]
    responsibilities: Optional[str]
    role_and_title: Optional[str]
    background_and_experience: Optional[str]
    career_development: Optional[str]

class EducationalAndTeachingDynamics(BaseModel):
    educational_level: Optional[str]
    teaching_and_learning_methods: Optional[str]
    instructional_style_and_approach: Optional[str]
    preferred_learning_styles: Optional[str]
    curriculum_development_and_focus: Optional[str]

class PersonaDescription(BaseModel):
    domain_and_focus: Optional[DomainAndFocus]
    expertise_traits: Optional[ExpertiseTraits]
    characteristics: Optional[Characteristics]
    professional_profile: Optional[ProfessionalProfile]
    educational_and_teaching_dynamics: Optional[EducationalAndTeachingDynamics]

class Persona(BaseModel):
    persona_name: str
    persona_description: PersonaDescription

class PersonaWithNarrative(BaseModel):
    persona_name: str
    persona_description: PersonaDescription
    persona_narrative: str

class ChatMessage(BaseModel):
    sender_name: str
    sender_avatar: str
    message: str
class GeneratePersonaQuestionsSuggestionsRequest(BaseModel):
    persona: dict
    topic: str
    dialogue_history: List[ChatMessage]


class Point(BaseModel):
    agent: str
    point: str
    agent_role: Optional[str] = None
    post_ids: Optional[List[str]] = None

class LiteratureReference(BaseModel):
    title: str
    url: str


class Section(BaseModel):
    title: str
    points: List[Point]
    relevant_literature: Optional[List[LiteratureReference]] = None


class PerspectivesSummary(BaseModel):
    sections: List[Section]


class MotivationPoint(BaseModel):
    point: str


class Work(BaseModel):
    title: str
    description: str
    url: Optional[str] = None


class RelatedWorkCategory(BaseModel):
    category: str
    works: List[Work]


class MethodSection(BaseModel):
    title: str
    points: List[str]


class ResearchProposal(BaseModel):
    motivation: List[MotivationPoint]
    related_works: List[RelatedWorkCategory]
    method: List[MethodSection]
    potential_outcomes: List[str]


class ProjectSummaryReport(BaseModel):
    perspectives_summary: PerspectivesSummary
    research_proposal: ResearchProposal