-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to identify client-side IDs
CREATE OR REPLACE FUNCTION is_client_id(id text) RETURNS boolean AS $$
BEGIN
  RETURN id LIKE 'client-%';
END;
$$ LANGUAGE plpgsql;

-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, 
  repo_name TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add indexes for better performance
  CONSTRAINT documents_repo_user_unique UNIQUE (user_id, repo_name, created_at)
);

-- Create chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, 
  repo_name TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Create policies for documents that work with both auth users and client IDs
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid()::TEXT = user_id OR is_client_id(user_id));

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id OR is_client_id(user_id));

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid()::TEXT = user_id OR is_client_id(user_id));

-- Create policies for chats that work with both auth users and client IDs
CREATE POLICY "Users can view their own chats"
  ON chats FOR SELECT
  USING (auth.uid()::TEXT = user_id OR is_client_id(user_id));

CREATE POLICY "Users can insert their own chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id OR is_client_id(user_id));

CREATE POLICY "Users can delete their own chats"
  ON chats FOR DELETE
  USING (auth.uid()::TEXT = user_id OR is_client_id(user_id));