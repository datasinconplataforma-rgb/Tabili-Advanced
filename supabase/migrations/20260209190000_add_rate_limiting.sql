-- Create extension for rate limiting if not exists
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create table for rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON rate_limits(ip_hash, endpoint, window_start);

-- Create function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_ip_hash TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  v_request_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate window start (current time minus window minutes)
  v_window_start := NOW() - INTERVAL '1 minute' * p_window_minutes;

  -- Get current request count for this IP/endpoint/window
  SELECT COALESCE(SUM(request_count), 0) INTO v_request_count
  FROM rate_limits
  WHERE ip_hash = p_ip_hash
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;

  -- Return true if under limit
  RETURN v_request_count < p_max_requests;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_ip_hash TEXT,
  p_endpoint TEXT
) RETURNS VOID AS $$
BEGIN
  -- Insert or update rate limit counter
  INSERT INTO rate_limits (ip_hash, endpoint, request_count, window_start)
  VALUES (p_ip_hash, p_endpoint, 1, NOW())
  ON CONFLICT (ip_hash, endpoint, window_start) 
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;