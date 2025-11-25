-- Enable the vector extension
create extension if not exists vector;

-- Add embedding column to tasks table
alter table tasks 
add column if not exists embedding vector(768);

-- Create a function to search for tasks
create or replace function match_tasks (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  name text,
  description text,
  status text,
  due_at timestamptz,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    tasks.id,
    tasks.name,
    tasks.description,
    tasks.status,
    tasks.due_at,
    1 - (tasks.embedding <=> query_embedding) as similarity
  from tasks
  where 1 - (tasks.embedding <=> query_embedding) > match_threshold
  order by tasks.embedding <=> query_embedding
  limit match_count;
end;
$$;
