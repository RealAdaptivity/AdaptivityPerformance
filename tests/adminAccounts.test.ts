import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const file = readdirSync('supabase/migrations').find((f) => f.endsWith('_admin_manage_admins.sql'));
const sql = file ? readFileSync(`supabase/migrations/${file}`, 'utf8') : '';

function body(fn: string): string {
  const start = sql.indexOf(`function public.${fn}(`);
  assert.ok(start >= 0, `${fn} missing`);
  return sql.slice(start, sql.indexOf('$$;', start));
}

test('only an admin can grant or revoke admin', () => {
  assert.ok(file, 'admin_manage_admins migration missing');
  for (const fn of ['grant_admin', 'revoke_admin']) {
    assert.match(body(fn), /current_user_role\(\)\) is distinct from 'admin'::public\.user_role then\s+raise exception/);
  }
});

test('neither function is callable without signing in', () => {
  assert.match(sql, /revoke all on function public\.grant_admin\(text\) from public, anon;/);
  assert.match(sql, /revoke all on function public\.revoke_admin\(uuid\) from public, anon;/);
});

test('an admin cannot remove themselves, so one always remains', () => {
  assert.match(body('revoke_admin'), /p_profile_id = auth\.uid\(\) then\s+raise exception/);
});

test('granting admin never creates a login: the account must already exist', () => {
  assert.doesNotMatch(body('grant_admin'), /insert into/i);
  assert.match(body('grant_admin'), /if not found then\s+raise exception 'No account uses/);
});
