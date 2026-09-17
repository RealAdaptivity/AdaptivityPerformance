-- Hourly labor rate, stored per quote.
--
-- The site advertises "a flat $125/hr labor rate" but nothing computed from it:
-- every tool asked for a flat dollar figure and left the arithmetic to whoever
-- was typing. Storing the rate on the quote means a reprint a month later shows
-- the rate that was actually quoted, not today's.
--
-- Filename matches the version Supabase recorded when this was applied. Naming
-- it anything else is what broke the Supabase Preview check earlier.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS labor_rate_cents integer NOT NULL DEFAULT 12500;
