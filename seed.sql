-- Seed 20 random tasks for the first user found in auth.users
-- Run this in the Supabase SQL Editor

INSERT INTO tasks (user_id, name, description, status, due_at, created_at)
SELECT
  u.id,
  'Task ' || s.i || ': ' || (ARRAY['Review PR', 'Update Documentation', 'Fix Bug', 'Plan Sprint', 'Email Client'])[floor(random() * 5 + 1)],
  'This is a generated description for task ' || s.i,
  CASE WHEN random() > 0.7 THEN 'done' ELSE 'pending' END,
  CASE WHEN random() > 0.5 THEN (NOW() + (floor(random() * 10) || ' days')::interval) ELSE NULL END,
  NOW() - (floor(random() * 100) || ' hours')::interval
FROM
  auth.users u
CROSS JOIN
  generate_series(1, 20) AS s(i)
LIMIT 20;
