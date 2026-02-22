-- Drop existing table and recreate
DROP TABLE IF EXISTS public.users CASCADE;

-- Users table to store app-specific user data
-- Has its own UUID, links to auth.users via auth_id

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic')),
  -- Plex connection fields
  plex_user_id TEXT,
  plex_username TEXT,
  plex_email TEXT,
  plex_avatar_url TEXT,
  plex_token TEXT,
  plex_connected_at TIMESTAMP WITH TIME ZONE,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

-- Function to handle new user signup
-- Extracts name from OAuth metadata (Google provides 'full_name' or 'name')
-- For email signups, first_name and last_name will be NULL (prompts user to complete profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name TEXT;
  first TEXT;
  last TEXT;
BEGIN
  -- Try to get full name from OAuth metadata (Google uses 'full_name' or 'name')
  full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name'
  );

  -- Split full name into first and last name
  IF full_name IS NOT NULL AND full_name != '' THEN
    -- Take first word as first name, rest as last name
    first := split_part(full_name, ' ', 1);
    last := NULLIF(TRIM(SUBSTRING(full_name FROM LENGTH(first) + 2)), '');
  ELSE
    first := NULL;
    last := NULL;
  END IF;

  INSERT INTO public.users (auth_id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    first,
    last,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user record on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
