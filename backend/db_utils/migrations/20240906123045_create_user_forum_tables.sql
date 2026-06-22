-- Create user_forum_threads table to store forum threads per user
CREATE TABLE IF NOT EXISTS user_forum_threads (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    thread_id VARCHAR(255) NOT NULL,
    thread_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(user_id, thread_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_forum_threads_user_id ON user_forum_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_forum_threads_thread_id ON user_forum_threads(thread_id);
CREATE INDEX IF NOT EXISTS idx_user_forum_threads_updated_at ON user_forum_threads(updated_at DESC);

-- Create user_agent_settings table to store agent settings per user
CREATE TABLE IF NOT EXISTS user_agent_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    settings JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(user_id, agent_name)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_agent_settings_user_id ON user_agent_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agent_settings_agent_name ON user_agent_settings(agent_name); 