/* ContactSection has always inserted into public.contact_inquiries, but the
   table was never created: every Contact Us submission failed and the enquiry
   was lost. Create it, and record the SMS opt-in alongside, because a consent
   you cannot produce later is not a consent a carrier will accept. */
create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text,
  email text,
  vehicle text,
  issue_description text not null,
  preferred_contact text not null default 'text',
  /* The opt-in itself, plus the exact wording shown at the time. Storing the
     text means a later edit to the form cannot rewrite what someone agreed to,
     which is the whole evidentiary point. */
  sms_consent boolean,
  sms_consent_text text,
  sms_consent_at timestamptz,
  status text not null default 'new'
);

alter table public.contact_inquiries enable row level security;

/* Same shape as partner_applications and tech_applications: the public form
   may insert, only an admin may read or work the queue. */
drop policy if exists contact_inquiries_anon_insert on public.contact_inquiries;
create policy contact_inquiries_anon_insert
  on public.contact_inquiries for insert
  to anon, authenticated
  with check (true);

drop policy if exists contact_inquiries_admin_select on public.contact_inquiries;
create policy contact_inquiries_admin_select
  on public.contact_inquiries for select
  to authenticated
  using (exists (select 1 from profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy if exists contact_inquiries_admin_update on public.contact_inquiries;
create policy contact_inquiries_admin_update
  on public.contact_inquiries for update
  to authenticated
  using (exists (select 1 from profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create index if not exists contact_inquiries_created_idx on public.contact_inquiries (created_at desc);
create index if not exists contact_inquiries_status_idx on public.contact_inquiries (status) where status = 'new';
