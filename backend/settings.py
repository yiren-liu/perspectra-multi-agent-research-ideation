from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, Literal
from pydantic import Field, field_validator

class Settings(BaseSettings):
    openai_api_type: Optional[Literal["azure", "openai"]] = Field(default=None, validation_alias="OPENAI_API_TYPE")
    openai_api_key: Optional[str] = Field(default=None, validation_alias="OPENAI_API_KEY")
    openai_api_base: Optional[str] = Field(default=None, validation_alias="OPENAI_API_BASE")
    openai_api_version: Optional[str] = Field(default=None, validation_alias="OPENAI_API_VERSION")
    
    # Model configuration
    openai_model: str = Field(default="gpt-4o", validation_alias="OPENAI_MODEL")
    openai_model_mini: str = Field(default="gpt-4o-mini", validation_alias="OPENAI_MODEL_MINI")
    
    s2_api_key: Optional[str] = Field(default=None, validation_alias="S2_API_KEY")
    
    # OpenAlex configuration
    openalex_email: Optional[str] = Field(default=None, validation_alias="OPENALEX_EMAIL")
    openalex_api_key: Optional[str] = Field(default=None, validation_alias="OPENALEX_API_KEY")

    reranker_type: Optional[str] = Field(default=None, validation_alias="RERANKER_TYPE")
    cohere_api_url: Optional[str] = Field(default=None, validation_alias="COHERE_API_URL")
    cohere_api_key: Optional[str] = Field(default=None, validation_alias="COHERE_API_KEY")

    jwt_secret: Optional[str] = Field(default=None, validation_alias="SUPABASE_JWT_SECRET")
    supabase_url: Optional[str] = Field(default=None, validation_alias="SUPABASE_URL")
    supabase_service_key: Optional[str] = Field(default=None, validation_alias="SUPABASE_SERVICE_KEY")

    postgres_url: Optional[str] = Field(default=None, validation_alias="POSTGRES_URL")
    # SMTP server settings
    smtp_host: Optional[str] = Field(default=None, validation_alias="SMTP_HOST")
    smtp_port: Optional[str] = Field(default=None, validation_alias="SMTP_PORT")
    smtp_user: Optional[str] = Field(default=None, validation_alias="SMTP_USER")
    smtp_password: Optional[str] = Field(default=None, validation_alias="SMTP_PASSWORD")
    smtp_from: Optional[str] = Field(default=None, validation_alias="SMTP_FROM")
    smtp_sender_name: Optional[str] = Field(default=None, validation_alias="SMTP_SENDER_NAME")

    # app configs
    lightrag_working_dir: str = Field(default="./temp/lightrag", validation_alias="LIGHTRAG_WORKING_DIR")
    
    # user study mode
    user_study_mode: bool = Field(default=False, validation_alias="USER_STUDY_MODE")

    # web server
    session_secret_key: Optional[str] = Field(default=None, validation_alias="SESSION_SECRET_KEY")
    # Comma-separated list of allowed CORS origins, e.g. "https://app.example.com,http://localhost:3000".
    allowed_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173",
        validation_alias="ALLOWED_ORIGINS",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        env_file_encoding="utf-8",
    )

    @field_validator("openai_api_version")
    @classmethod
    def validate_api_version(cls, v, info):
        if info.data.get("openai_api_type") == "azure" and not v:
            raise ValueError("openai_api_version is required when api_type is 'azure'")
        return v

# Instantiate the settings
app_settings = Settings()

