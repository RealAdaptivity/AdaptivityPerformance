-- =======================================================
-- ADAPTIVITY PERFORMANCE - SUPABASE DATABASE SCHEMA
-- Project URL: https://qqyairzymqpkbfxobztx.supabase.co
-- =======================================================
-- Copy and paste this SQL script into your Supabase Dashboard:
-- Dashboard -> SQL Editor -> New Query -> Run
-- =======================================================

-- 1. Bookings Table (Mobile Dispatch & Shop Repair Tickets)
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    zip_code TEXT DEFAULT '76247',
    vehicle TEXT NOT NULL,
    vin TEXT,
    services TEXT[] NOT NULL,
    total_estimate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'UNASSIGNED', -- UNASSIGNED, EN_ROUTE, ON_SITE, COMPLETED
    tech_id TEXT,
    tech_name TEXT,
    distance_miles NUMERIC(5,2) DEFAULT 5.2,
    eta_minutes INT DEFAULT 15,
    location_type TEXT DEFAULT 'mobile', -- mobile, shop
    date_created TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime on Bookings Table for GPS Van Tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- 2. Mechanics Table (Mobile Technicians 70/30 Revenue Split)
CREATE TABLE IF NOT EXISTS public.mechanics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT UNIQUE,
    van_number TEXT DEFAULT 'Van #4 (Justin)',
    stripe_account_id TEXT,
    revenue_share_pct NUMERIC(5,2) DEFAULT 80.00,
    tools_verified BOOLEAN DEFAULT TRUE,
    rating NUMERIC(3,2) DEFAULT 4.95,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customer Garage Vehicles Vault
CREATE TABLE IF NOT EXISTS public.customer_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone TEXT NOT NULL,
    year TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    trim TEXT,
    health_score INT DEFAULT 88,
    odometer INT DEFAULT 45200,
    license_plate TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Digital Vehicle Inspection (DVI) Reports
CREATE TABLE IF NOT EXISTS public.inspection_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id TEXT REFERENCES public.bookings(id),
    inspector_name TEXT DEFAULT 'Alex Vance (ASE Master Tech)',
    brakes_status TEXT DEFAULT 'GOOD',
    battery_status TEXT DEFAULT 'GOOD',
    fluids_status TEXT DEFAULT 'ATTENTION',
    tires_status TEXT DEFAULT 'GOOD',
    struts_status TEXT DEFAULT 'GOOD',
    customer_signature_url TEXT,
    approved_services TEXT[],
    total_approved_cost NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Adaptivity Shield VIP Memberships
CREATE TABLE IF NOT EXISTS public.vip_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    plan_id TEXT NOT NULL, -- basic, vip, fleet
    billing_cycle TEXT DEFAULT 'annual',
    status TEXT DEFAULT 'ACTIVE',
    date_activated TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Initial Seed Mechanics & Demo Booking
INSERT INTO public.mechanics (id, name, phone, van_number, stripe_account_id)
VALUES ('tech-1', 'Alex Vance', '(214) 620-3244', 'Van #4 (Justin)', 'acct_demo123')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bookings (id, customer_name, customer_phone, customer_address, vehicle, services, total_estimate, status, distance_miles, eta_minutes)
VALUES ('AP-8492', 'Mark Stevens', '(214) 620-3244', '1234 Canyon Falls Dr, Northlake, TX 76226', '2021 Ford F-150 SuperCrew', ARRAY['Front Ceramic Brake Pads & Rotors'], 280.00, 'UNASSIGNED', 5.2, 15)
ON CONFLICT (id) DO NOTHING;
