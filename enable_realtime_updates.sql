-- Enable Realtime for updates table
-- This allows the frontend to receive real-time notifications when updates are created/modified

-- Enable realtime for the updates table
ALTER PUBLICATION supabase_realtime ADD TABLE public.updates;

-- Note: If the publication doesn't exist, create it first:
-- CREATE PUBLICATION supabase_realtime FOR TABLE public.updates;
