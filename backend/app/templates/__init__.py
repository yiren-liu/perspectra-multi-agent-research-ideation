import yaml
from pathlib import Path

def load_template_from_yml(template_path: str | Path) -> dict:
    """
    Load a persona template from a YAML file.
    
    Args:
        template_path: Path to the YAML template file
        
    Returns:
        dict: The loaded template as a dictionary
        
    Raises:
        FileNotFoundError: If template file does not exist
        yaml.YAMLError: If template file is not valid YAML
    """
    template_path = Path(template_path)
    if not template_path.exists():
        raise FileNotFoundError(f"Template file not found: {template_path}")
        
    with open(template_path) as f:
        try:
            template = yaml.safe_load(f)
        except yaml.YAMLError as e:
            raise yaml.YAMLError(f"Error parsing template YAML: {e}")
            
    return template

def get_default_persona_template() -> dict:
    """
    Load the default persona template bundled with the package.
    
    Returns:
        dict: The default template as a dictionary
    """
    default_path = Path(__file__).parent / "persona_template.yml"
    return load_template_from_yml(default_path)

def get_full_persona_template() -> dict:
    """
    Load the full persona template bundled with the package.
    
    Returns:
        dict: The default template as a dictionary
    """
    default_path = Path(__file__).parent / "persona_template_full.yml"
    return load_template_from_yml(default_path)

if __name__ == "__main__":
    print(get_default_persona_template())