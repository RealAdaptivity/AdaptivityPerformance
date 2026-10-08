-- Quotes carry the vehicle's VIN.
--
-- The quote builder now asks for the VIN before any service or labor line, so
-- parts and labor are priced for the exact vehicle (NHTSA decodes it into the
-- year, make, model, trim and engine). Older quotes have none, so the column
-- stays nullable; anything stored must look like a VIN.

alter table public.quotes add column if not exists vin text;
alter table public.quotes drop constraint if exists quotes_vin_format;
alter table public.quotes add constraint quotes_vin_format check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$');
comment on column public.quotes.vin is
  'The vehicle''s VIN. The quote builder requires it before any service or labor is entered, so parts and labor are priced for the exact vehicle. Empty on quotes made before that rule.';
