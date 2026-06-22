import json

from tqdm import tqdm

from app.agents.base import PersonaAgent

from settings import app_settings

import logging
if app_settings.app_mode == "prod":
    logging.basicConfig(level=logging.INFO)
else:
    logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    topic = "AI"

    agent = PersonaAgent()
    logger.info(f"Generating personas for topic: {topic}")
    personas, literature_review = agent.generate_personas_from_topic(topic)
    logger.info(f"Generated {len(personas)} personas")
    # dump to json
    with open("personas.json", "w") as f:
        json.dump([p for p in personas], f, indent=4)

    # generate ideas using persona agents
    logger.info(f"Generating ideas for {len(personas)} personas")
    ideas = agent.generate_idea_persona_agent_batch(personas, topic, literature_review)
    logger.info(f"Generated {len(ideas)} ideas")
    with open("ideas_personas.json", "w") as f:
        json.dump(ideas, f, indent=4)
    
    # generate ideas using plain agent
    logger.info(f"Generating ideas using plain agent")
    ideas = agent.generate_ideas_plain_agent(topic, literature_review)
    logger.info(f"Generated {len(ideas)} ideas")
    with open("ideas_plain.json", "w") as f:
        json.dump(ideas, f, indent=4)
