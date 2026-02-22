-- PandaTV Database Schema
-- Separate tables for users and media server connections

-- Drop existing tables
DROP TABLE IF EXISTS public.plex_connections CASCADE;
DROP TABLE IF EXISTS public.iptv_connections CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

-- ============================================
-- PLEX CONNECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.plex_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plex_user_id TEXT NOT NULL,
  plex_username TEXT,
  plex_email TEXT,
  plex_avatar_url TEXT,
  plex_token TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- One Plex connection per user
);

-- Enable Row Level Security
ALTER TABLE public.plex_connections ENABLE ROW LEVEL SECURITY;

-- Users can read their own Plex connection
CREATE POLICY "Users can read own plex connection" ON public.plex_connections
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Users can insert their own Plex connection
CREATE POLICY "Users can insert own plex connection" ON public.plex_connections
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Users can update their own Plex connection
CREATE POLICY "Users can update own plex connection" ON public.plex_connections
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Users can delete their own Plex connection
CREATE POLICY "Users can delete own plex connection" ON public.plex_connections
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ============================================
-- IPTV CONNECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.iptv_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider_name TEXT, -- User-defined name for the provider
  connection_type TEXT NOT NULL CHECK (connection_type IN ('m3u', 'xtream')),
  -- M3U fields
  m3u_url TEXT,
  -- Xtream Codes fields
  xtream_host TEXT,
  xtream_username TEXT,
  xtream_password TEXT,
  -- Metadata
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id) -- One IPTV connection per user
);

-- Enable Row Level Security
ALTER TABLE public.iptv_connections ENABLE ROW LEVEL SECURITY;

-- Users can read their own IPTV connections
CREATE POLICY "Users can read own iptv connections" ON public.iptv_connections
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Users can insert their own IPTV connections
CREATE POLICY "Users can insert own iptv connections" ON public.iptv_connections
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Users can update their own IPTV connections
CREATE POLICY "Users can update own iptv connections" ON public.iptv_connections
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Users can delete their own IPTV connections
CREATE POLICY "Users can delete own iptv connections" ON public.iptv_connections
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

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

-- Trigger for users table
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger for plex_connections table
DROP TRIGGER IF EXISTS plex_connections_updated_at ON public.plex_connections;
CREATE TRIGGER plex_connections_updated_at
  BEFORE UPDATE ON public.plex_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger for iptv_connections table
DROP TRIGGER IF EXISTS iptv_connections_updated_at ON public.iptv_connections;
CREATE TRIGGER iptv_connections_updated_at
  BEFORE UPDATE ON public.iptv_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
