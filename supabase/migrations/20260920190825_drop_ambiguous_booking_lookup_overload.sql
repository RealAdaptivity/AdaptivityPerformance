-- Keeping a one-argument overload alongside the two-argument version (whose
-- second argument defaults) makes the call ambiguous: Postgres cannot choose,
-- and PostgREST calls fail with "function is not unique". The two-argument
-- version already accepts a single argument via its default, so the overload
-- is dropped.
drop function if exists public.get_booking_by_reference(text);
