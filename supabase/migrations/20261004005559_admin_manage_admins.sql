-- Admins add and remove other admins from the dashboard (Admins tab).
--
-- Until now the only way to make an admin was the one-time bootstrap (which
-- stops once any admin exists) or SQL in the Supabase dashboard, where a plain
-- UPDATE of profiles.role is silently undone by profiles_guard_role unless
-- adaptivity.bypass_role_guard is set first.
--
-- Both functions check the caller is an admin themselves; nothing here is
-- reachable by a customer or tech. The person must already have an account
-- (they sign up at /portal): granting admin never creates a login.

create or replace function public.grant_admin(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_profile public.profiles%rowtype;
begin
  if (select public.current_user_role()) is distinct from 'admin'::public.user_role then
    raise exception 'Only an admin can add admins';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address';
  end if;

  select * into v_profile from public.profiles where lower(email) = v_email limit 1;
  if not found then
    raise exception 'No account uses %. Ask them to sign up at adaptivityperformance.com/portal first, then add them here.', v_email;
  end if;

  if v_profile.role is distinct from 'admin'::public.user_role then
    -- The caller is an admin, so profiles_guard_role lets this through.
    update public.profiles set role = 'admin'::public.user_role, updated_at = now()
    where id = v_profile.id;
  end if;

  return jsonb_build_object(
    'id', v_profile.id,
    'email', v_profile.email,
    'full_name', v_profile.full_name,
    'already_admin', v_profile.role = 'admin'::public.user_role
  );
end;
$$;

-- Removing an admin puts them back to what they were: a tech if they still
-- have an active technician record, otherwise a customer. You cannot remove
-- yourself, so there is always at least one admin left.
create or replace function public.revoke_admin(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_new_role public.user_role;
begin
  if (select public.current_user_role()) is distinct from 'admin'::public.user_role then
    raise exception 'Only an admin can remove admins';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'You cannot remove your own admin access. Ask another admin to do it.';
  end if;

  select role into v_role from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'Account not found';
  end if;
  if v_role is distinct from 'admin'::public.user_role then
    raise exception 'That account is not an admin';
  end if;

  v_new_role := case
    when exists (
      select 1 from public.mechanic_details m
      where m.profile_id = p_profile_id and m.terminated_at is null
    ) then 'tech'::public.user_role
    else 'customer'::public.user_role
  end;

  update public.profiles set role = v_new_role, updated_at = now() where id = p_profile_id;
  return jsonb_build_object('id', p_profile_id, 'role', v_new_role);
end;
$$;

revoke all on function public.grant_admin(text) from public, anon;
revoke all on function public.revoke_admin(uuid) from public, anon;
grant execute on function public.grant_admin(text) to authenticated;
grant execute on function public.revoke_admin(uuid) to authenticated;
