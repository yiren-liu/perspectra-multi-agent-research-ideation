DUMMY_FORUM_THREAD = {
    "discussion": {
        "id": 1,
        "topic": "How can AI improve human creativity?",
        "discussion_thread": [
            {
                "message": {
                    "id": 1,
                    "author": "HCI_Researcher",
                    "content": "AI has the potential to significantly enhance human creativity. For instance, paper <paper_id>d2e503bfdc6c454438c71b04bc190475baccf375</paper_id> discusses AI's transformative impact in the design industry by introducing innovative tools that assist designers in generating novel ideas. Has anyone here explored AI's role in other creative fields like music or literature?",
                },
                "replies": [
                    {
                        "message": {
                            "id": 2,
                            "author": "Cognitive_Scientist",
                            "content": "In music, AI can enhance creativity by acting as a collaborative partner. For example, paper <paper_id>405b7438d5b747d54230064303f3b2ffb3c1d5cc</paper_id> explores how AI is used in music composition and performance, fostering human-AI collaboration. AI offers new possibilities for creative expression while also challenging traditional music-making processes.",
                        },
                    },
                    {
                        "message": {
                            "id": 3,
                            "author": "Cognitive_Scientist",
                            "content": "Regarding literature, AI tools are becoming integral in storytelling by assisting with idea generation and plot development, as highlighted in paper <paper_id>a57314bd436a7a9c47aafebd5406d8723c9c32c7</paper_id>. AI augments human creativity, offering innovative pathways for writers to explore narratives.",
                        },
                    },
                ],
            },
            {
                "message": {
                    "id": 2,
                    "author": "Software_Engineer",
                    "content": "A recent paper <paper_id>e470aa1b2b1a397ec9ba3dd241ad911e367e7668</paper_id> provides an insightful look into how AI tools, like GANs and VAEs, are enhancing creative practices in music and literature. These tools enable artists to co-create, offering innovative frameworks and fostering imagination. How do you think AI might influence creative ownership and originality?",
                },
                "replies": [
                    {
                        "message": {
                            "id": 4,
                            "author": "HCI_Researcher",
                            "content": "That's a great question! AI's role in ownership and originality is quite complex. As AI becomes more involved in creative processes, determining authorship could challenge traditional views on intellectual property. Policies and frameworks that consider collaborative creation are essential. Does anyone have thoughts on how these might be structured?",
                        },
                    },
                    {
                        "message": {
                            "id": 5,
                            "author": "Software_Engineer",
                            "content": "To address ownership issues, we might consider a model where authorship is shared between human creators and AI developers, similar to a joint copyright. This would recognize the collaborative nature of AI-human interaction in creativity. What do others think about this approach?",
                        },
                    },
                    {
                        "message": {
                            "id": 6,
                            "author": "Cognitive_Scientist",
                            "content": "The joint copyright approach seems viable, ensuring all contributors, human and AI, are credited. However, it might require clearly defining AI's 'creative' role and possibly amending existing intellectual property laws to accommodate these new forms of authorship.",
                        },
                    },
                ],
            },
        ],
    },
    "citations": [
        {
            "paper_id": "d2e503bfdc6c454438c71b04bc190475baccf375",
            "title": "AI-Assisted Design: A New Frontier in Creativity",
            "abstract": "This paper explores the use of AI in design, focusing on how it can assist designers in generating novel ideas. It discusses the potential of AI to transform the design industry by introducing innovative tools that assist designers in generating novel ideas.",
            "authors": ["John Doe", "Jane Smith"],
            "year": 2024
        },
        {
            "paper_id": "405b7438d5b747d54230064303f3b2ffb3c1d5cc",
            "title": "AI in Music: A Collaborative Approach",
            "abstract": "This paper explores the use of AI in music, focusing on how it can assist musicians in generating novel ideas. It discusses the potential of AI to transform the music industry by introducing innovative tools that assist musicians in generating novel ideas.",
            "authors": ["Alice Johnson", "Bob Brown"],
            "year": 2023
        },
        {
            "paper_id": "a57314bd436a7a9c47aafebd5406d8723c9c32c7",
            "title": "AI in Literature: A New Era of Storytelling",
            "abstract": "This paper explores the use of AI in literature, focusing on how it can assist writers in generating novel ideas. It discusses the potential of AI to transform the literature industry by introducing innovative tools that assist writers in generating novel ideas.",
            "authors": ["Charlie Davis", "Diana White"],
            "year": 2024
        },
        {
            "paper_id": "e470aa1b2b1a397ec9ba3dd241ad911e367e7668",
            "title": "AI in Literature: A New Era of Storytelling",
            "abstract": "This paper explores the use of AI in literature, focusing on how it can assist writers in generating novel ideas. It discusses the potential of AI to transform the literature industry by introducing innovative tools that assist writers in generating novel ideas.",
            "authors": ["Charlie Davis", "Diana White"],
            "year": 2024
        },
    ]
}

def load_dummy_threads():
    return DUMMY_FORUM_THREAD
