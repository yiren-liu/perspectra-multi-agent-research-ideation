def get_scheme_attribute_generation_prompt():
    """
    This prompt template is used to generate a scheme for attributes to compare papers.
    Template input variables:
        - num_attributes : the number of attributes to compare the papers
        - formatted_papers : a list of formatted papers
    Reference: Newman, B., Lee, Y., Naik, A., Siangliulue, P., Fok, R., Kim, J., ... & Lo, K. (2024). ArxivDIGESTables: Synthesizing Scientific Literature into Tables using Language Models. arXiv preprint arXiv:2410.22360.
    """
    prompt = """You are an intelligent and precise assistant that can understand the contents of research papers. You are knowledgable on different fields and domains of science, in particular computer science. You are able to interpret research papers, create questions and answers, and compare multiple papers.

Imagine the following scenario: A user is making a table for a scholarly paper that contains information about multiple papers and compares these papers. To compare and contrast the papers, the user provides the title and content of each paper. Your task is the following: Given a list of papers, you should find aspects that are shared by the given research papers. Then, within each aspect, you should identify {num_attributes} attributes that can be used to compare the given papers.

First, you should return the list of similar aspects as a list as follows as the value of the key "aspects_overview": 
\"[\"<similar aspect that all given papers shared>\", ...]\". 
Then, think of each aspect as the topic for the Related Work section of the user's paper. 
Finally, find attributes that can compare the given papers within the Related Work section. 
Return a JSON object in the following format:\n\n```json\n{{\n  \"aspects_overview\": [\"<aspect 1>\", \"<aspect 2>\", ...],\n  \"<aspect 1>\": [\"<comparable attribute within the aspect 1>\", \"<comparable attribute within the aspect 1>\", ...],\n  ...\n}}\n```\n\n

Here are the papers:
<papers>
{formatted_papers}
</papers>

Now, generate the scheme for the attributes to compare the papers. Your output must be a valid JSON object."""
    return prompt



def get_column_value_extraction_prompt():
    """
    This prompt template is used to extract values for each column based on individual papers.
    Template input variables:
        - column_names : a list of column names for which values need to be extracted
        - paper_content : the full text of the paper
    """
    prompt = """You are an intelligent and precise assistant that can understand the contents of research papers. You are knowledgeable in different fields and domains of science, particularly computer science. You are able to interpret research papers, extract relevant information, and provide concise answers.

Imagine the following scenario: A user is creating a table for a scholarly paper that contains information extracted from individual research papers. For each paper, the user needs to fill in values for specific columns in the table. Your task is to extract the necessary information from the given paper to populate these columns.

For each column in the list of column names, extract the relevant information from the paper content. 
The columns have the following JSON format: 
{{
    'aspect_name_1': ['column_name_1', 'column_name_2', ...],
    ...
}}
Return a JSON object with the column names as keys and the extracted values as their corresponding values. 

Here is the paper content:
<paper_content>
{paper_content}
</paper_content>

Here are the column names:
<column_names>
{column_names}
</column_names>

You should return a JSON object in the following format:
```json
{{
    "column_name_1": {{"gist": "<extracted value>", "references": ["<excerpt 1>", "<excerpt 2>", ...]}},
    ...
}}
```
The "gist" field should contain the extracted value, and the "references" field should contain a list of excerpts from the paper that support the extracted value. 
If there is no answer, return an empty dictionary, i.e., `{{}}`.

Now, extract the values for each column. Your output must be a valid JSON object."""
    return prompt



def get_table_value_question_prompt():
    """
    This prompt template is used to generate questions for the attributes in the table.
    """
    prompt = """You are an intelligent and precise assistant that can understand the contents of research papers. You are knowledgable on different fields and domains of science, in particular computer science. You are able to interpret research papers, create questions and answers, and compare multiple papers.

Answer a question using the provided scientific paper.

Your response should be a JSON object with the following fields:
- **answer**: The answer to the question. The answer should use concise language, but be comprehensive. Only provide answers that are objectively supported by the text in the paper.
- **excerpts**: A list of one or more *EXACT* text spans extracted from the paper that support the answer. Return at most ten spans, and no more than 800 words. Make sure to cover all aspects of the answer above.

If there is no answer, return an empty dictionary, i.e., `{}`.

**Paper**: `{ full_text }`

**Given the information above, please answer the question**: "{question}".
"""
    return prompt


def get_persona_additional_scheme_attribute_generation_prompt():
    """
    This prompt template is used to generate additional attributes for the table based on personas.
    Input variables:
        - num_attributes : the number of attributes to compare the papers
        - formatted_papers : a list of formatted papers
        - persona_description : the description of the persona
        - past_table_values : the past table values
    """
    prompt = """You are an intelligent and precise assistant that can understand the contents of research papers. You are able to interpret research papers, extract relevant information, and provide concise answers.
You will play the following persona: 
<persona_description>
{persona_description}
</persona_description>

Imagine the following scenario: A user is making a table for a scholarly paper that contains information about multiple papers and compares these papers. To compare and contrast the papers, the user provides the title and content of each paper. 
Your task is the following: Given a list of papers, you should find aspects that are shared by the given research papers. The aspects should be unique and not shared by the past table values, from your expertise. Then, within each aspect, you should identify {num_attributes} attributes that can be used to compare the given papers.

Return a JSON object in the following format:\n\n```json\n["<aspect 1>", "<aspect 2>", ...]\n```\n\n

Here are the papers:
<papers>
{formatted_papers}
</papers>

Here are the past table schema:
<past_table_schema>
{past_table_values}
</past_table_schema>

Now, generate the scheme for the attributes to compare the papers. Your output must be a valid JSON object."""
    return prompt

def get_persona_additional_column_value_extraction_prompt():
    """
    This prompt template is used to generate additional attributes for the table based on personas.
    """
    prompt = """You are an intelligent and precise assistant that can understand the contents of research papers. You are able to interpret research papers, extract relevant information, and provide concise answers.
You will play the following persona: 
<persona_description>
{persona_description}
</persona_description>


Imagine the following scenario: A user is creating a table for a scholarly paper that contains information extracted from individual research papers. For each paper, the user needs to fill in values for specific columns in the table. 
Your task is to extract the necessary information from the given paper to populate these columns.

For each column in the list of column names, extract the relevant information from the paper content. 
The columns have the following JSON format: 
{{
    'aspect_name_1': ['column_name_1', 'column_name_2', ...],
    ...
}}
Return a JSON object with the column names as keys and the extracted values as their corresponding values. 

Here is the paper content:
<paper_content>
{paper_content}
</paper_content>

Here are the column names:
<column_names>
{column_names}
</column_names>

You should return a JSON object in the following format:
```json
{{
    "column_name_1": {{"gist": "<extracted value>", "references": ["<excerpt 1>", "<excerpt 2>", ...]}},
    ...
}}
```
The "gist" field should contain the extracted value, and the "references" field should contain a list of excerpts from the paper that support the extracted value. 
If there is no answer, return an empty dictionary, i.e., `{{}}`.

Now, extract the values for each column. Your output must be a valid JSON object."""
    return prompt


def get_persona_table_generation_prompt():
    """
    This prompt template is used to generate a table for the persona axis.
    """
    prompt = """You are an intelligent assistant that helps summarize a dialogue history among a panel of experts into a table of contents.
Your task is to read the dialogue history and extract the main points and topics discussed, and the perspectives from each expert, and then generate a table of contents that summarizes the dialogue history.

Here is the dialogue history:
<dialogue_history>
{dialogue_history}
</dialogue_history>

The table of contents should have the following JSON format:
{{
    "table_of_contents": [
        {{"topic": "<topic 1>", "perspectives": [
            {{"persona_id": "<expert 1>", "perspective": "<perspective 1>"}},
            {{"persona_id": "<expert 2>", "perspective": "<perspective 2>"}},
            ...
        ]}},
        ...
    ]
}}
Now, generate the table of contents. Your output must be a valid JSON object."""
    return prompt

def get_persona_desc_edits_prompt():
    """
    This prompt template is used to generate edits for the persona description.
    """
    prompt = """You are an intelligent and precise assistant that helps a user to edit their persona description during the creation of a AI-powered expert research assistant. Your task is to generate a set of edits to a persona's description that incorporates the user's edits. Your output must be a valid JSON object.

You are provided with the following persona description:
<persona_description>
{original_persona}
</persona_description>

The user wants to edit the persona description based on the following instruction:
<instruction>
{instruction}
</instruction>

Your output must be a valid JSON object, following the following format:
{{
    "edited_persona": {{
        "<key>": {{
            "path": ["<path_element_1>", "<path_element_2>", ...],
            "old_value": "<old_value>",
            "new_value": "<new_value>"
        }},
        ...
    }}
}}
The path should be a list of keys that point to the edited value in the persona description (which is a nested object). For example, one path can be ["DomainAndFocus", "LevelOfExpertise"]. 
And the <key> should be the last element of the path.

Now generate a set of edits to the persona description that incorporates the user's edits. 
"""
    return prompt