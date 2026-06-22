def get_judge_idea_all_prompt():
    prompt = """
You are a judge in a competition. You have to decide which idea is better.

The idea0 is: {idea0}

The idea1 is: {idea1}

The topic is: {topic}

Which idea do you think is better? Please write a short paragraph to explain your choice.

Here are your evaluation criteria:
1. Novelty: Are the problems or approaches new? Is this a novel combination of familiar techniques? Is it clear how this work differs from previous contributions? Is related work adequately referenced? 
2. Significance: Are the idea important? Are other people (practitioners or researchers) likely to use these ideas or build on them? Does the idea address a difficult problem in a better way than previous research? Does it provide a unique theoretical or pragmatic approach?
3. Feasibility: Can the idea be realized with existing technology or methods? Are there any technical difficulties or bottlenecks? Is the idea clear and logical? Is there any obvious error or unreasonable part in the idea, and can the experiment be designed normally according to this idea. 
4. Clarity: Is the paper clearly written? Is it well-organized? Does it adequately inform the reader? 
5. Effectiveness: How likely the proposed idea is going to work well (e.g., better than existing baselines).

Note: 
Avoid any position biases and ensure that the order in which the responses were presented does not influence your decision. DO NOT allow the LENGTH of the responses to influence your evaluation, choose the one that is straight-to-the-point instead of unnecessarily verbose. Be as objective as possible. (very important!!!)

If you think idea0 is better than idea1, you should output 0. If you think idea1 is better than idea0, you should output 1. If you think idea0 and idea1 are equally good, you should output 2.

Your output should be strictly in the following JSON format:
{{
    "thinking_process": "...",
    "choice": {{
        "novelty": "0 or 1 or 2",
        "significance": "0 or 1 or 2",
        "feasibility": "0 or 1 or 2",
        "clarity": "0 or 1 or 2",
        "effectiveness": "0 or 1 or 2"
    }}
}}
Your response should be strictly in the above JSON format.
"""
    return prompt


