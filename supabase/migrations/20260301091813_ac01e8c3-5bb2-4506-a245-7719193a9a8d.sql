
-- Enable pgcrypto extension properly
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Function to hash passwords using extensions schema
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = 'public'
AS $$
  SELECT extensions.crypt(password, extensions.gen_salt('bf', 8))
$$;
