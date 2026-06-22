import json
import re

def to_camel_case(snake_str):
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def convert_keys_to_camel_case(data):
    if isinstance(data, dict):
        new_dict = {}
        for key, value in data.items():
            new_key = to_camel_case(key.replace(" ", "_").replace("-", "_"))
            new_dict[new_key] = convert_keys_to_camel_case(value)
        return new_dict
    elif isinstance(data, list):
        return [convert_keys_to_camel_case(item) for item in data]
    else:
        return data
    
def formatting_personas_for_frontend(persona: dict):
    return {
        "id": persona["persona_name"],
        "name": persona["persona_name"],
        "personaDescription": convert_keys_to_camel_case(persona["persona_description"])
    }

def load_demo_personas():
    mapped_personas = []
    for persona in DUMMY_DATA["personas"]:
        mapped_personas.append(formatting_personas_for_frontend(persona))
    return mapped_personas

def load_demo_personas_for_prompt():
    mapped_personas = []
    for persona in DUMMY_DATA["personas"]:
        mapped_personas.append({
            "persona_name": persona["persona_name"],
            "persona_description": str(persona["persona_description"])
        })
    return mapped_personas

def load_demo_papers():
    return DUMMY_DATA["papers"]


DUMMY_DATA = {
    "personas": [
        {
            "persona_name": "Dr. Emily Harper",
            "persona_description": {
                "Domain and Focus": {
                    "Level of Expertise": "expert",
                    "Research Area": "HCI",
                    "Research Interests": "human-computer interaction, AI-assisted creative writing",
                    "Specializations and Subfields": {
                        "Geographical Expertise": "North America",
                        "Cultural Expertise": "digital cultures",
                        "Research Context and Setting": "lab-based",
                        "Audience Demographics": "academic researchers, industry professionals"
                    },
                    "Temporal Shift in Research Focus": "from traditional HCI to AI-assisted creative processes",
                    "Preferred Publication Channels": "journals, conferences"
                },
                "Expertise Traits": {
                    "Application Areas": "education, creative industries",
                    "Domain Knowledge": "artificial intelligence, cognitive science",
                    "Professional Domain": "academia",
                    "Analytical and Methodological Framework": {
                        "Research Methodology": "mixed-methods",
                        "Technical Skills": "programming, statistical analysis",
                        "Analytical Skills": "critical thinking, problem-solving",
                        "Theoretical Frameworks and Approaches": "theoretical orientation"
                    },
                    "Impact and Influences": "policy change, technological innovation"
                },
                "Characteristics": {
                    "Personality Traits": "open-minded, detail-oriented",
                    "Behavioral Patterns": "collaborative, independent",
                    "Cognitive Styles": {
                        "Problem-Solving Style": "analytical",
                        "Decision-Making Style": "data-driven",
                        "Complexity Tolerance": "comfort with ambiguity"
                    },
                    "Socio-Emotional Attributes": {
                        "Emotional Intelligence": "empathy, self-awareness",
                        "Communication Style": "formal, persuasive",
                        "Writing Style and Tone": "formal",
                        "Interpersonal Skills": "teamwork, conflict resolution"
                    },
                    "Personal Values and Goals": {
                        "Core Values": "integrity, innovation",
                        "Objectives and Goals": "publish frequently, develop long-term projects",
                        "Challenges": "time management, securing funding"
                    }
                },
                "Professional Profile": {
                    "Work Context and Environment": "academic institution",
                    "Professional Skills": "project management, leadership",
                    "Work Style": "structured, flexible",
                    "Responsibilities": "managing a team, mentoring students",
                    "Role and Title": "professor, research scientist",
                    "Background and Experience": "academic tenure",
                    "Career Development": "pursuing tenure"
                },
                "Educational and Teaching Dynamics": {
                    "Educational Level": "PhD",
                    "Teaching and Learning Methods": {
                        "Instructional Style and Approach": "experiential learning",
                        "Preferred Learning Styles": "visual, auditory",
                        "Curriculum Development and Focus": "syllabus design, topic selection"
                    }
                }
            }
        },
        {
            "persona_name": "Alex Martinez",
            "persona_description": {
                "Domain and Focus": {
                    "Level of Expertise": "intermediate",
                    "Research Area": "machine learning",
                    "Research Interests": "language models, creative writing",
                    "Specializations and Subfields": {
                        "Geographical Expertise": "South America",
                        "Cultural Expertise": "indigenous cultures",
                        "Research Context and Setting": "field research",
                        "Audience Demographics": "industry professionals, creative writers"
                    },
                    "Temporal Shift in Research Focus": "from NLP to creative writing",
                    "Preferred Publication Channels": "conferences, industry reports"
                },
                "Expertise Traits": {
                    "Application Areas": "creative industries, technology development",
                    "Domain Knowledge": "natural language processing, computational creativity",
                    "Professional Domain": "industry",
                    "Analytical and Methodological Framework": {
                        "Research Methodology": "quantitative",
                        "Technical Skills": "programming, machine learning",
                        "Analytical Skills": "problem-solving, critical thinking",
                        "Theoretical Frameworks and Approaches": "computational creativity"
                    },
                    "Impact and Influences": "technological innovation, product development"
                },
                "Characteristics": {
                    "Personality Traits": "innovative, detail-oriented",
                    "Behavioral Patterns": "independent, collaborative",
                    "Cognitive Styles": {
                        "Problem-Solving Style": "creative",
                        "Decision-Making Style": "data-driven",
                        "Complexity Tolerance": "comfort with ambiguity"
                    },
                    "Socio-Emotional Attributes": {
                        "Emotional Intelligence": "self-awareness, empathy",
                        "Communication Style": "informal, persuasive",
                        "Writing Style and Tone": "narrative",
                        "Interpersonal Skills": "teamwork, conflict resolution"
                    },
                    "Personal Values and Goals": {
                        "Core Values": "innovation, creativity",
                        "Objectives and Goals": "develop cutting-edge applications, publish in top-tier venues",
                        "Challenges": "balancing innovation with practicality"
                    }
                },
                "Professional Profile": {
                    "Work Context and Environment": "corporate office",
                    "Professional Skills": "project management, technical leadership",
                    "Work Style": "flexible, fast-paced",
                    "Responsibilities": "leading development teams, mentoring junior developers",
                    "Role and Title": "team lead, machine learning engineer",
                    "Background and Experience": "industry experience",
                    "Career Development": "moving into leadership roles"
                },
                "Educational and Teaching Dynamics": {
                    "Educational Level": "Master's",
                    "Teaching and Learning Methods": {
                        "Instructional Style and Approach": "project-based learning",
                        "Preferred Learning Styles": "visual, kinesthetic",
                        "Curriculum Development and Focus": "topic selection, practical applications"
                    }
                }
            }
        },
        {
            "persona_name": "Jamie Lee",
            "persona_description": {
                "Domain and Focus": {
                    "Level of Expertise": "novice",
                    "Research Area": "cognitive science",
                    "Research Interests": "creativity, AI-human interaction",
                    "Specializations and Subfields": {
                        "Geographical Expertise": "Europe",
                        "Cultural Expertise": "digital cultures",
                        "Research Context and Setting": "field research",
                        "Audience Demographics": "academic researchers, creative writers"
                    },
                    "Temporal Shift in Research Focus": "from cognitive psychology to AI-human interaction",
                    "Preferred Publication Channels": "journals, workshops"
                },
                "Expertise Traits": {
                    "Application Areas": "education, creative industries",
                    "Domain Knowledge": "cognitive psychology, artificial intelligence",
                    "Professional Domain": "academia",
                    "Analytical and Methodological Framework": {
                        "Research Methodology": "qualitative",
                        "Technical Skills": "data analysis, experimental design",
                        "Analytical Skills": "critical thinking, problem-solving",
                        "Theoretical Frameworks and Approaches": "cognitive theories"
                    },
                    "Impact and Influences": "educational reform, creative practice enhancement"
                },
                "Characteristics": {
                    "Personality Traits": "curious, open-minded",
                    "Behavioral Patterns": "collaborative, independent",
                    "Cognitive Styles": {
                        "Problem-Solving Style": "creative",
                        "Decision-Making Style": "intuitive",
                        "Complexity Tolerance": "comfort with ambiguity"
                    },
                    "Socio-Emotional Attributes": {
                        "Emotional Intelligence": "empathy, self-awareness",
                        "Communication Style": "informal, narrative",
                        "Writing Style and Tone": "narrative",
                        "Interpersonal Skills": "teamwork, conflict resolution"
                    },
                    "Personal Values and Goals": {
                        "Core Values": "creativity, collaboration",
                        "Objectives and Goals": "develop innovative research projects, collaborate with diverse teams",
                        "Challenges": "securing research funding, balancing multiple projects"
                    }
                },
                "Professional Profile": {
                    "Work Context and Environment": "academic institution",
                    "Professional Skills": "project management, research design",
                    "Work Style": "flexible, fast-paced",
                    "Responsibilities": "conducting research, mentoring students",
                    "Role and Title": "research assistant, PhD candidate",
                    "Background and Experience": "academic experience",
                    "Career Development": "pursuing PhD"
                },
                "Educational and Teaching Dynamics": {
                    "Educational Level": "PhD candidate",
                    "Teaching and Learning Methods": {
                        "Instructional Style and Approach": "experiential learning",
                        "Preferred Learning Styles": "visual, auditory",
                        "Curriculum Development and Focus": "topic selection, practical applications"
                    }
                }
            }
        }
    ],
    "papers": [
        {
            "id": "187eefa5167705cf916751c135aa650c545a87a8",
            "title": "Pron vs Prompt: Can Large Language Models already Challenge a World-Class Fiction Author at Creative Text Writing?",
            "abstract": "It has become routine to report research results where Large Language Models (LLMs) outperform average humans in a wide range of language-related tasks, and creative text writing is no exception. It seems natural, then, to raise the bid: Are LLMs ready to compete in creative writing skills with a top (rather than average) novelist? To provide an initial answer for this question, we have carried out a contest between Patricio Pron (an awarded novelist, considered one of the best of his generation) and GPT-4 (one of the top performing LLMs), in the spirit of AI-human duels such as DeepBlue vs Kasparov and AlphaGo vs Lee Sidol. We asked Pron and GPT-4 to provide thirty titles each, and then to write short stories for both their titles and their opponent's. Then, we prepared an evaluation rubric inspired by Boden's definition of creativity, and we collected 5,400 manual assessments provided by literature critics and scholars. The results of our experimentation indicate that LLMs are still far from challenging a top human creative writer, and that reaching such level of autonomous creative writing skills probably cannot be reached simply with larger language models.",
            "authors": [
                "Guillermo Marco",
                "Julio Gonzalo",
                "Ram'on del Castillo",
                "M. Girona"
            ],
            "url": "https://www.semanticscholar.org/paper/187eefa5167705cf916751c135aa650c545a87a8",
            "topic": "Large Language Models in creative writing",
            "year": "2024",
            "venue": "arXiv.org",
            "citationCount": "3"
        },
        {
            "id": "1d500905ca70d40a85d10f60d44a018ec0d9349d",
            "title": "Weaver: Foundation Models for Creative Writing",
            "abstract": "This work introduces Weaver, our first family of large language models (LLMs) dedicated to content creation. Weaver is pre-trained on a carefully selected corpus that focuses on improving the writing capabilities of large language models. We then fine-tune Weaver for creative and professional writing purposes and align it to the preference of professional writers using a suit of novel methods for instruction data synthesis and LLM alignment, making it able to produce more human-like texts and follow more diverse instructions for content creation. The Weaver family consists of models of Weaver Mini (1.8B), Weaver Base (6B), Weaver Pro (14B), and Weaver Ultra (34B) sizes, suitable for different applications and can be dynamically dispatched by a routing agent according to query complexity to balance response quality and computation cost. Evaluation on a carefully curated benchmark for assessing the writing capabilities of LLMs shows Weaver models of all sizes outperform generalist LLMs several times larger than them. Notably, our most-capable Weaver Ultra model surpasses GPT-4, a state-of-the-art generalist LLM, on various writing scenarios, demonstrating the advantage of training specialized LLMs for writing purposes. Moreover, Weaver natively supports retrieval-augmented generation (RAG) and function calling (tool usage). We present various use cases of these abilities for improving AI-assisted writing systems, including integration of external knowledge bases, tools, or APIs, and providing personalized writing assistance. Furthermore, we discuss and summarize a guideline and best practices for pre-training and fine-tuning domain-specific LLMs.",
            "authors": [
                "Tiannan Wang",
                "Jiamin Chen",
                "Qingrui Jia",
                "Shuai Wang",
                "Ruoyu Fang",
                "Huilin Wang",
                "Zhaowei Gao",
                "Chunzhao Xie",
                "Chuou Xu",
                "Jihong Dai",
                "Yibin Liu",
                "Jialong Wu",
                "Shengwei Ding",
                "Long Li",
                "Zhiwei Huang",
                "Xinle Deng",
                "Teng Yu",
                "Gangan Ma",
                "Han Xiao",
                "Z. Chen",
                "Danjun Xiang",
                "Yunxia Wang",
                "Yuanyuan Zhu",
                "Yi Xiao",
                "Jing Wang",
                "Yiru Wang",
                "Siran Ding",
                "Jiayang Huang",
                "Jiayi Xu",
                "Yilihamujiang Tayier",
                "Zhenyu Hu",
                "Yuan Gao",
                "Chengfeng Zheng",
                "Yu-Jie Ye",
                "Yihan Li",
                "Lei Wan",
                "Xinyue Jiang",
                "Yujie Wang",
                "Siyuan Cheng",
                "Zhule Song",
                "Xiangru Tang",
                "Xiaohua Xu",
                "Ningyu Zhang",
                "Huajun Chen",
                "Yuchen Eleanor Jiang",
                "Wangchunshu Zhou"
            ],
            "url": "https://www.semanticscholar.org/paper/1d500905ca70d40a85d10f60d44a018ec0d9349d",
            "topic": "LLM for creative writing",
            "year": "2024",
            "venue": "arXiv.org",
            "citationCount": "11"
        },
        {
            "id": "af9026b17af8074344f7ee982d9eb2edc6499d6b",
            "title": "The HaLLMark Effect: Supporting Provenance and Transparent Use of Large Language Models in Writing with Interactive Visualization",
            "abstract": "The use of Large Language Models (LLMs) for writing has sparked controversy both among readers and writers. On one hand, writers are concerned that LLMs will deprive them of agency and ownership, and readers are concerned about spending their time on text generated by soulless machines. On the other hand, AI-assistance can improve writing as long as writers can conform to publisher policies, and as long as readers can be assured that a text has been verified by a human. We argue that a system that captures the provenance of interaction with an LLM can help writers retain their agency, conform to policies, and communicate their use of AI to publishers and readers transparently. Thus we propose HaLLMark, a tool for visualizing the writer’s interaction with the LLM. We evaluated HaLLMark with 13 creative writers, and found that it helped them retain a sense of control and ownership of the text.",
            "authors": [
                "Md. Naimul Hoque",
                "Tasfia Mashiat",
                "Bhavya Ghai",
                "Cecilia Shelton",
                "Fanny Chevalier",
                "Kari Kraus",
                "Niklas Elmqvist"
            ],
            "url": "https://www.semanticscholar.org/paper/af9026b17af8074344f7ee982d9eb2edc6499d6b",
            "topic": "Large Language Models in creative writing",
            "year": "2023",
            "venue": "International Conference on Human Factors in Computing Systems",
            "citationCount": "3"
        },
        {
            "id": "cefecb93e701aa65c48a50aed0faa78f91a56f65",
            "title": "Roleplay with Large Language Model-Based Characters: A Creative Writers Perspective (short paper) Paolo Grigis",
            "abstract": "Recent advancements in large language models (LLMs) had a significant resonance in the artistic sector. As a result, numerous dialogue interfaces show potential applications for creative practices, of which creative writing is the focus of this paper. Although some studies have identified roleplaying with LLMs as a strategy to support artistic inspiration, there are still many open questions. For example, studies on how writers could employ LLMs based on roleplay with fictional characters require further investigation. To address this gap, we present a case study we are designing for the involvement of creative writers in roleplay interaction with LLMs. This study aims to provide training on how to use Faraday. dev, (a platform designed to create LLM-based characters). Subsequently, we will invite the writers to roleplay with their creations and complete a creative writing task. Collecting the prompt used to edit the characters, the chat logs between the writers and the characters, the final writing excerpts, and conducting follow-up interviews, we aim to gain insights on how LLM-based characters impact creative writing. Ultimately, this study seeks to inform the design of roleplay-based systems and enhance support for creative practice in the HCI domain.",
            "authors": [
                "Paolo Grigis",
                "A. D. Angeli"
            ],
            "url": "https://www.semanticscholar.org/paper/cefecb93e701aa65c48a50aed0faa78f91a56f65",
            "topic": "LLM for creative writing",
            "year": "2024",
            "venue": "SYNERGY@AVI",
            "citationCount": "1"
        },
        {
            "id": "f02c487572472dd20d064f0755b85b7e1aacf86f",
            "title": "Unmet Creativity Support Needs in Computationally Supported Creative Writing",
            "abstract": "Large language models (LLMs) enabled by the datasets and computing power of the last decade have recently gained popularity for their capacity to generate plausible natural language text from human-provided prompts. This ability makes them appealing to fiction writers as prospective co-creative agents, addressing the common challenge of writer’s block, or getting unstuck. However, creative writers face additional challenges, including maintaining narrative consistency, developing plot structure, architecting reader experience, and refining their expressive intent, which are not well-addressed by current LLM-backed tools. In this paper, we define these needs by grounding them in cognitive and theoretical literature, then survey previous computational narrative research that holds promise for supporting each of them in a co-creative setting.",
            "authors": [
                "Max Kreminski",
                "Chris Martens"
            ],
            "url": "https://www.semanticscholar.org/paper/f02c487572472dd20d064f0755b85b7e1aacf86f",
            "topic": "LLM for creative writing",
            "year": "2022",
            "venue": "IN2WRITING",
            "citationCount": "20"
        },
        {
            "id": "c4270cece55dbdf1f7dd202a89c63d812d63ed2a",
            "title": "Turning Up the Heat: Min-p Sampling for Creative and Coherent LLM Outputs",
            "abstract": "Large Language Models (LLMs) generate text by sampling the next token from a probability distribution over the vocabulary at each decoding step. However, popular sampling methods like top-p (nucleus sampling) often struggle to balance quality and diversity, especially at higher temperatures, leading to incoherent or repetitive outputs. To address this challenge, we propose min-p sampling, a dynamic truncation method that adjusts the sampling threshold based on the model's confidence by scaling according to the top token's probability. We conduct extensive experiments on benchmarks including GPQA, GSM8K, and AlpacaEval Creative Writing, demonstrating that min-p sampling improves both the quality and diversity of generated text, particularly at high temperatures. Moreover, human evaluations reveal a clear preference for min-p sampling in terms of both text quality and diversity. Min-p sampling has been adopted by multiple open-source LLM implementations, highlighting its practical utility and potential impact.",
            "authors": [
                "Minh Nguyen",
                "Andrew Baker",
                "Clement Neo",
                "Allen Roush",
                "Andreas Kirsch",
                "Ravid Shwartz-Ziv"
            ],
            "url": "https://www.semanticscholar.org/paper/c4270cece55dbdf1f7dd202a89c63d812d63ed2a",
            "topic": "LLM for creative writing",
            "year": "2024",
            "venue": "",
            "citationCount": "0"
        },
        {
            "id": "1c7402843d8b586d945b3b030e3edd93f0ae3959",
            "title": "On the Creativity of Large Language Models",
            "abstract": "Large Language Models (LLMs) are revolutionizing several areas of Artificial Intelligence. One of the most remarkable applications is creative writing, e.g., poetry or storytelling: the generated outputs are often of astonishing quality. However, a natural question arises: can LLMs be really considered creative? In this article, we first analyze the development of LLMs under the lens of creativity theories, investigating the key open questions and challenges. In particular, we focus our discussion on the dimensions of value, novelty, and surprise as proposed by Margaret Boden in her work. Then, we consider different classic perspectives, namely product, process, press, and person. We discuss a set of ``easy'' and ``hard'' problems in machine creativity, presenting them in relation to LLMs. Finally, we examine the societal impact of these technologies with a particular focus on the creative industries, analyzing the opportunities offered, the challenges arising from them, and the potential associated risks, from both legal and ethical points of view.",
            "authors": [
                "Giorgio Franceschelli",
                "Mirco Musolesi"
            ],
            "url": "https://www.semanticscholar.org/paper/1c7402843d8b586d945b3b030e3edd93f0ae3959",
            "topic": "Large Language Models in creative writing",
            "year": "2023",
            "venue": "arXiv.org",
            "citationCount": "35"
        },
        {
            "id": "7b1a6db0909856a345f055a9607f43711b3df375",
            "title": "Art or Artifice? Large Language Models and the False Promise of Creativity",
            "abstract": "Researchers have argued that large language models (LLMs) exhibit high-quality writing capabilities from blogs to stories. However, evaluating objectively the creativity of a piece of writing is challenging. Inspired by the Torrance Test of Creative Thinking (TTCT) [64], which measures creativity as a process, we use the Consensual Assessment Technique [3] and propose Torrance Test of Creative Writing (TTCW) to evaluate creativity as product. TTCW consists of 14 binary tests organized into the original dimensions of Fluency, Flexibility, Originality, and Elaboration. We recruit 10 creative writers and implement a human assessment of 48 stories written either by professional authors or LLMs using TTCW. Our analysis shows that LLM-generated stories pass 3-10X less TTCW tests than stories written by professionals. In addition, we explore the use of LLMs as assessors to automate the TTCW evaluation, revealing that none of the LLMs positively correlate with the expert assessments.",
            "authors": [
                "Tuhin Chakrabarty",
                "Philippe Laban",
                "Divyansh Agarwal",
                "S. Muresan",
                "Chien-Sheng Wu"
            ],
            "url": "https://www.semanticscholar.org/paper/7b1a6db0909856a345f055a9607f43711b3df375",
            "topic": "Large Language Models in creative writing",
            "year": "2023",
            "venue": "International Conference on Human Factors in Computing Systems",
            "citationCount": "61"
        }
    ]
}

DUMMY_DATA_LEGACY_FULL_TAXONOMY = {
    "personas": [
        {
            "persona_name": "Dr. Emily Harper",
            "persona_description": {
                "Domain and Focus": {
                    "Level of Expertise": "expert",
                    "Research Area": "HCI",
                    "Research Interests": "human-computer interaction, AI-assisted creative writing",
                    "Specializations and Subfields": {
                        "Geographical Expertise": "North America",
                        "Cultural Expertise": "digital cultures",
                        "Research Context and Setting": "lab-based",
                        "Audience Demographics": "academic researchers, industry professionals"
                    },
                    "Temporal Shift in Research Focus": "from traditional HCI to AI-assisted creative processes",
                    "Preferred Publication Channels": "journals, conferences"
                },
                "Expertise Traits": {
                    "Application Areas": "education, creative industries",
                    "Domain Knowledge": "artificial intelligence, cognitive science",
                    "Professional Domain": "academia",
                    "Analytical and Methodological Framework": {
                        "Research Methodology": "mixed-methods",
                        "Technical Skills": "programming, statistical analysis",
                        "Analytical Skills": "critical thinking, problem-solving",
                        "Theoretical Frameworks and Approaches": "theoretical orientation"
                    },
                    "Impact and Influences": "policy change, technological innovation"
                },
                "Characteristics": {
                    "Personality Traits": "open-minded, detail-oriented",
                    "Behavioral Patterns": "collaborative, independent",
                    "Cognitive Styles": {
                        "Problem-Solving Style": "analytical",
                        "Decision-Making Style": "data-driven",
                        "Complexity Tolerance": "comfort with ambiguity"
                    },
                    "Socio-Emotional Attributes": {
                        "Emotional Intelligence": "empathy, self-awareness",
                        "Communication Style": "formal, persuasive",
                        "Writing Style and Tone": "formal",
                        "Interpersonal Skills": "teamwork, conflict resolution"
                    },
                    "Personal Values and Goals": {
                        "Core Values": "integrity, innovation",
                        "Objectives and Goals": "publish frequently, develop long-term projects",
                        "Challenges": "time management, securing funding"
                    }
                },
                "Professional Profile": {
                    "Work Context and Environment": "academic institution",
                    "Professional Skills": "project management, leadership",
                    "Work Style": "structured, flexible",
                    "Responsibilities": "managing a team, mentoring students",
                    "Role and Title": "professor, research scientist",
                    "Background and Experience": "academic tenure",
                    "Career Development": "pursuing tenure"
                },
                "Educational and Teaching Dynamics": {
                    "Educational Level": "PhD",
                    "Teaching and Learning Methods": {
                        "Instructional Style and Approach": "experiential learning",
                        "Preferred Learning Styles": "visual, auditory",
                        "Curriculum Development and Focus": "syllabus design, topic selection"
                    }
                }
            }
        },
        {
            "persona_name": "Alex Martinez",
            "persona_description": {
                "Domain and Focus": {
                    "Level of Expertise": "intermediate",
                    "Research Area": "machine learning",
                    "Research Interests": "language models, creative writing",
                    "Specializations and Subfields": {
                        "Geographical Expertise": "South America",
                        "Cultural Expertise": "indigenous cultures",
                        "Research Context and Setting": "field research",
                        "Audience Demographics": "industry professionals, creative writers"
                    },
                    "Temporal Shift in Research Focus": "from NLP to creative writing",
                    "Preferred Publication Channels": "conferences, industry reports"
                },
                "Expertise Traits": {
                    "Application Areas": "creative industries, technology development",
                    "Domain Knowledge": "natural language processing, computational creativity",
                    "Professional Domain": "industry",
                    "Analytical and Methodological Framework": {
                        "Research Methodology": "quantitative",
                        "Technical Skills": "programming, machine learning",
                        "Analytical Skills": "problem-solving, critical thinking",
                        "Theoretical Frameworks and Approaches": "computational creativity"
                    },
                    "Impact and Influences": "technological innovation, product development"
                },
                "Characteristics": {
                    "Personality Traits": "innovative, detail-oriented",
                    "Behavioral Patterns": "independent, collaborative",
                    "Cognitive Styles": {
                        "Problem-Solving Style": "creative",
                        "Decision-Making Style": "data-driven",
                        "Complexity Tolerance": "comfort with ambiguity"
                    },
                    "Socio-Emotional Attributes": {
                        "Emotional Intelligence": "self-awareness, empathy",
                        "Communication Style": "informal, persuasive",
                        "Writing Style and Tone": "narrative",
                        "Interpersonal Skills": "teamwork, conflict resolution"
                    },
                    "Personal Values and Goals": {
                        "Core Values": "innovation, creativity",
                        "Objectives and Goals": "develop cutting-edge applications, publish in top-tier venues",
                        "Challenges": "balancing innovation with practicality"
                    }
                },
                "Professional Profile": {
                    "Work Context and Environment": "corporate office",
                    "Professional Skills": "project management, technical leadership",
                    "Work Style": "flexible, fast-paced",
                    "Responsibilities": "leading development teams, mentoring junior developers",
                    "Role and Title": "team lead, machine learning engineer",
                    "Background and Experience": "industry experience",
                    "Career Development": "moving into leadership roles"
                },
                "Educational and Teaching Dynamics": {
                    "Educational Level": "Master's",
                    "Teaching and Learning Methods": {
                        "Instructional Style and Approach": "project-based learning",
                        "Preferred Learning Styles": "visual, kinesthetic",
                        "Curriculum Development and Focus": "topic selection, practical applications"
                    }
                }
            }
        },
        {
            "persona_name": "Jamie Lee",
            "persona_description": {
                "Domain and Focus": {
                    "Level of Expertise": "novice",
                    "Research Area": "cognitive science",
                    "Research Interests": "creativity, AI-human interaction",
                    "Specializations and Subfields": {
                        "Geographical Expertise": "Europe",
                        "Cultural Expertise": "digital cultures",
                        "Research Context and Setting": "field research",
                        "Audience Demographics": "academic researchers, creative writers"
                    },
                    "Temporal Shift in Research Focus": "from cognitive psychology to AI-human interaction",
                    "Preferred Publication Channels": "journals, workshops"
                },
                "Expertise Traits": {
                    "Application Areas": "education, creative industries",
                    "Domain Knowledge": "cognitive psychology, artificial intelligence",
                    "Professional Domain": "academia",
                    "Analytical and Methodological Framework": {
                        "Research Methodology": "qualitative",
                        "Technical Skills": "data analysis, experimental design",
                        "Analytical Skills": "critical thinking, problem-solving",
                        "Theoretical Frameworks and Approaches": "cognitive theories"
                    },
                    "Impact and Influences": "educational reform, creative practice enhancement"
                },
                "Characteristics": {
                    "Personality Traits": "curious, open-minded",
                    "Behavioral Patterns": "collaborative, independent",
                    "Cognitive Styles": {
                        "Problem-Solving Style": "creative",
                        "Decision-Making Style": "intuitive",
                        "Complexity Tolerance": "comfort with ambiguity"
                    },
                    "Socio-Emotional Attributes": {
                        "Emotional Intelligence": "empathy, self-awareness",
                        "Communication Style": "informal, narrative",
                        "Writing Style and Tone": "narrative",
                        "Interpersonal Skills": "teamwork, conflict resolution"
                    },
                    "Personal Values and Goals": {
                        "Core Values": "creativity, collaboration",
                        "Objectives and Goals": "develop innovative research projects, collaborate with diverse teams",
                        "Challenges": "securing research funding, balancing multiple projects"
                    }
                },
                "Professional Profile": {
                    "Work Context and Environment": "academic institution",
                    "Professional Skills": "project management, research design",
                    "Work Style": "flexible, fast-paced",
                    "Responsibilities": "conducting research, mentoring students",
                    "Role and Title": "research assistant, PhD candidate",
                    "Background and Experience": "academic experience",
                    "Career Development": "pursuing PhD"
                },
                "Educational and Teaching Dynamics": {
                    "Educational Level": "PhD candidate",
                    "Teaching and Learning Methods": {
                        "Instructional Style and Approach": "experiential learning",
                        "Preferred Learning Styles": "visual, auditory",
                        "Curriculum Development and Focus": "topic selection, practical applications"
                    }
                }
            }
        }
    ],
    "papers": [
        {
            "id": "187eefa5167705cf916751c135aa650c545a87a8",
            "title": "Pron vs Prompt: Can Large Language Models already Challenge a World-Class Fiction Author at Creative Text Writing?",
            "abstract": "It has become routine to report research results where Large Language Models (LLMs) outperform average humans in a wide range of language-related tasks, and creative text writing is no exception. It seems natural, then, to raise the bid: Are LLMs ready to compete in creative writing skills with a top (rather than average) novelist? To provide an initial answer for this question, we have carried out a contest between Patricio Pron (an awarded novelist, considered one of the best of his generation) and GPT-4 (one of the top performing LLMs), in the spirit of AI-human duels such as DeepBlue vs Kasparov and AlphaGo vs Lee Sidol. We asked Pron and GPT-4 to provide thirty titles each, and then to write short stories for both their titles and their opponent's. Then, we prepared an evaluation rubric inspired by Boden's definition of creativity, and we collected 5,400 manual assessments provided by literature critics and scholars. The results of our experimentation indicate that LLMs are still far from challenging a top human creative writer, and that reaching such level of autonomous creative writing skills probably cannot be reached simply with larger language models.",
            "authors": [
                "Guillermo Marco",
                "Julio Gonzalo",
                "Ram'on del Castillo",
                "M. Girona"
            ],
            "url": "https://www.semanticscholar.org/paper/187eefa5167705cf916751c135aa650c545a87a8",
            "topic": "Large Language Models in creative writing",
            "year": "2024",
            "venue": "arXiv.org",
            "citationCount": "3"
        },
        {
            "id": "1d500905ca70d40a85d10f60d44a018ec0d9349d",
            "title": "Weaver: Foundation Models for Creative Writing",
            "abstract": "This work introduces Weaver, our first family of large language models (LLMs) dedicated to content creation. Weaver is pre-trained on a carefully selected corpus that focuses on improving the writing capabilities of large language models. We then fine-tune Weaver for creative and professional writing purposes and align it to the preference of professional writers using a suit of novel methods for instruction data synthesis and LLM alignment, making it able to produce more human-like texts and follow more diverse instructions for content creation. The Weaver family consists of models of Weaver Mini (1.8B), Weaver Base (6B), Weaver Pro (14B), and Weaver Ultra (34B) sizes, suitable for different applications and can be dynamically dispatched by a routing agent according to query complexity to balance response quality and computation cost. Evaluation on a carefully curated benchmark for assessing the writing capabilities of LLMs shows Weaver models of all sizes outperform generalist LLMs several times larger than them. Notably, our most-capable Weaver Ultra model surpasses GPT-4, a state-of-the-art generalist LLM, on various writing scenarios, demonstrating the advantage of training specialized LLMs for writing purposes. Moreover, Weaver natively supports retrieval-augmented generation (RAG) and function calling (tool usage). We present various use cases of these abilities for improving AI-assisted writing systems, including integration of external knowledge bases, tools, or APIs, and providing personalized writing assistance. Furthermore, we discuss and summarize a guideline and best practices for pre-training and fine-tuning domain-specific LLMs.",
            "authors": [
                "Tiannan Wang",
                "Jiamin Chen",
                "Qingrui Jia",
                "Shuai Wang",
                "Ruoyu Fang",
                "Huilin Wang",
                "Zhaowei Gao",
                "Chunzhao Xie",
                "Chuou Xu",
                "Jihong Dai",
                "Yibin Liu",
                "Jialong Wu",
                "Shengwei Ding",
                "Long Li",
                "Zhiwei Huang",
                "Xinle Deng",
                "Teng Yu",
                "Gangan Ma",
                "Han Xiao",
                "Z. Chen",
                "Danjun Xiang",
                "Yunxia Wang",
                "Yuanyuan Zhu",
                "Yi Xiao",
                "Jing Wang",
                "Yiru Wang",
                "Siran Ding",
                "Jiayang Huang",
                "Jiayi Xu",
                "Yilihamujiang Tayier",
                "Zhenyu Hu",
                "Yuan Gao",
                "Chengfeng Zheng",
                "Yu-Jie Ye",
                "Yihan Li",
                "Lei Wan",
                "Xinyue Jiang",
                "Yujie Wang",
                "Siyuan Cheng",
                "Zhule Song",
                "Xiangru Tang",
                "Xiaohua Xu",
                "Ningyu Zhang",
                "Huajun Chen",
                "Yuchen Eleanor Jiang",
                "Wangchunshu Zhou"
            ],
            "url": "https://www.semanticscholar.org/paper/1d500905ca70d40a85d10f60d44a018ec0d9349d",
            "topic": "LLM for creative writing",
            "year": "2024",
            "venue": "arXiv.org",
            "citationCount": "11"
        },
        {
            "id": "af9026b17af8074344f7ee982d9eb2edc6499d6b",
            "title": "The HaLLMark Effect: Supporting Provenance and Transparent Use of Large Language Models in Writing with Interactive Visualization",
            "abstract": "The use of Large Language Models (LLMs) for writing has sparked controversy both among readers and writers. On one hand, writers are concerned that LLMs will deprive them of agency and ownership, and readers are concerned about spending their time on text generated by soulless machines. On the other hand, AI-assistance can improve writing as long as writers can conform to publisher policies, and as long as readers can be assured that a text has been verified by a human. We argue that a system that captures the provenance of interaction with an LLM can help writers retain their agency, conform to policies, and communicate their use of AI to publishers and readers transparently. Thus we propose HaLLMark, a tool for visualizing the writer’s interaction with the LLM. We evaluated HaLLMark with 13 creative writers, and found that it helped them retain a sense of control and ownership of the text.",
            "authors": [
                "Md. Naimul Hoque",
                "Tasfia Mashiat",
                "Bhavya Ghai",
                "Cecilia Shelton",
                "Fanny Chevalier",
                "Kari Kraus",
                "Niklas Elmqvist"
            ],
            "url": "https://www.semanticscholar.org/paper/af9026b17af8074344f7ee982d9eb2edc6499d6b",
            "topic": "Large Language Models in creative writing",
            "year": "2023",
            "venue": "International Conference on Human Factors in Computing Systems",
            "citationCount": "3"
        },
        {
            "id": "cefecb93e701aa65c48a50aed0faa78f91a56f65",
            "title": "Roleplay with Large Language Model-Based Characters: A Creative Writers Perspective (short paper) Paolo Grigis",
            "abstract": "Recent advancements in large language models (LLMs) had a significant resonance in the artistic sector. As a result, numerous dialogue interfaces show potential applications for creative practices, of which creative writing is the focus of this paper. Although some studies have identified roleplaying with LLMs as a strategy to support artistic inspiration, there are still many open questions. For example, studies on how writers could employ LLMs based on roleplay with fictional characters require further investigation. To address this gap, we present a case study we are designing for the involvement of creative writers in roleplay interaction with LLMs. This study aims to provide training on how to use Faraday. dev, (a platform designed to create LLM-based characters). Subsequently, we will invite the writers to roleplay with their creations and complete a creative writing task. Collecting the prompt used to edit the characters, the chat logs between the writers and the characters, the final writing excerpts, and conducting follow-up interviews, we aim to gain insights on how LLM-based characters impact creative writing. Ultimately, this study seeks to inform the design of roleplay-based systems and enhance support for creative practice in the HCI domain.",
            "authors": [
                "Paolo Grigis",
                "A. D. Angeli"
            ],
            "url": "https://www.semanticscholar.org/paper/cefecb93e701aa65c48a50aed0faa78f91a56f65",
            "topic": "LLM for creative writing",
            "year": "2024",
            "venue": "SYNERGY@AVI",
            "citationCount": "1"
        },
        {
            "id": "f02c487572472dd20d064f0755b85b7e1aacf86f",
            "title": "Unmet Creativity Support Needs in Computationally Supported Creative Writing",
            "abstract": "Large language models (LLMs) enabled by the datasets and computing power of the last decade have recently gained popularity for their capacity to generate plausible natural language text from human-provided prompts. This ability makes them appealing to fiction writers as prospective co-creative agents, addressing the common challenge of writer’s block, or getting unstuck. However, creative writers face additional challenges, including maintaining narrative consistency, developing plot structure, architecting reader experience, and refining their expressive intent, which are not well-addressed by current LLM-backed tools. In this paper, we define these needs by grounding them in cognitive and theoretical literature, then survey previous computational narrative research that holds promise for supporting each of them in a co-creative setting.",
            "authors": [
                "Max Kreminski",
                "Chris Martens"
            ],
            "url": "https://www.semanticscholar.org/paper/f02c487572472dd20d064f0755b85b7e1aacf86f",
            "topic": "LLM for creative writing",
            "year": "2022",
            "venue": "IN2WRITING",
            "citationCount": "20"
        },
        {
            "id": "c4270cece55dbdf1f7dd202a89c63d812d63ed2a",
            "title": "Turning Up the Heat: Min-p Sampling for Creative and Coherent LLM Outputs",
            "abstract": "Large Language Models (LLMs) generate text by sampling the next token from a probability distribution over the vocabulary at each decoding step. However, popular sampling methods like top-p (nucleus sampling) often struggle to balance quality and diversity, especially at higher temperatures, leading to incoherent or repetitive outputs. To address this challenge, we propose min-p sampling, a dynamic truncation method that adjusts the sampling threshold based on the model's confidence by scaling according to the top token's probability. We conduct extensive experiments on benchmarks including GPQA, GSM8K, and AlpacaEval Creative Writing, demonstrating that min-p sampling improves both the quality and diversity of generated text, particularly at high temperatures. Moreover, human evaluations reveal a clear preference for min-p sampling in terms of both text quality and diversity. Min-p sampling has been adopted by multiple open-source LLM implementations, highlighting its practical utility and potential impact.",
            "authors": [
                "Minh Nguyen",
                "Andrew Baker",
                "Clement Neo",
                "Allen Roush",
                "Andreas Kirsch",
                "Ravid Shwartz-Ziv"
            ],
            "url": "https://www.semanticscholar.org/paper/c4270cece55dbdf1f7dd202a89c63d812d63ed2a",
            "topic": "LLM for creative writing",
            "year": "2024",
            "venue": "",
            "citationCount": "0"
        },
        {
            "id": "1c7402843d8b586d945b3b030e3edd93f0ae3959",
            "title": "On the Creativity of Large Language Models",
            "abstract": "Large Language Models (LLMs) are revolutionizing several areas of Artificial Intelligence. One of the most remarkable applications is creative writing, e.g., poetry or storytelling: the generated outputs are often of astonishing quality. However, a natural question arises: can LLMs be really considered creative? In this article, we first analyze the development of LLMs under the lens of creativity theories, investigating the key open questions and challenges. In particular, we focus our discussion on the dimensions of value, novelty, and surprise as proposed by Margaret Boden in her work. Then, we consider different classic perspectives, namely product, process, press, and person. We discuss a set of ``easy'' and ``hard'' problems in machine creativity, presenting them in relation to LLMs. Finally, we examine the societal impact of these technologies with a particular focus on the creative industries, analyzing the opportunities offered, the challenges arising from them, and the potential associated risks, from both legal and ethical points of view.",
            "authors": [
                "Giorgio Franceschelli",
                "Mirco Musolesi"
            ],
            "url": "https://www.semanticscholar.org/paper/1c7402843d8b586d945b3b030e3edd93f0ae3959",
            "topic": "Large Language Models in creative writing",
            "year": "2023",
            "venue": "arXiv.org",
            "citationCount": "35"
        },
        {
            "id": "7b1a6db0909856a345f055a9607f43711b3df375",
            "title": "Art or Artifice? Large Language Models and the False Promise of Creativity",
            "abstract": "Researchers have argued that large language models (LLMs) exhibit high-quality writing capabilities from blogs to stories. However, evaluating objectively the creativity of a piece of writing is challenging. Inspired by the Torrance Test of Creative Thinking (TTCT) [64], which measures creativity as a process, we use the Consensual Assessment Technique [3] and propose Torrance Test of Creative Writing (TTCW) to evaluate creativity as product. TTCW consists of 14 binary tests organized into the original dimensions of Fluency, Flexibility, Originality, and Elaboration. We recruit 10 creative writers and implement a human assessment of 48 stories written either by professional authors or LLMs using TTCW. Our analysis shows that LLM-generated stories pass 3-10X less TTCW tests than stories written by professionals. In addition, we explore the use of LLMs as assessors to automate the TTCW evaluation, revealing that none of the LLMs positively correlate with the expert assessments.",
            "authors": [
                "Tuhin Chakrabarty",
                "Philippe Laban",
                "Divyansh Agarwal",
                "S. Muresan",
                "Chien-Sheng Wu"
            ],
            "url": "https://www.semanticscholar.org/paper/7b1a6db0909856a345f055a9607f43711b3df375",
            "topic": "Large Language Models in creative writing",
            "year": "2023",
            "venue": "International Conference on Human Factors in Computing Systems",
            "citationCount": "61"
        }
    ]
}