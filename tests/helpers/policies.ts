import { Client } from 'pg';

export interface PolicyRow {
  tablename: string;
  policyname: string;
  cmd: string;
  roles: string[];
  qual: string | null;
  with_check: string | null;
  permissive: string;
}

export const hasDbAccess = Boolean(process.env.PGHOST);

let cached: PolicyRow[] | null = null;

/** Reads the live RLS policies for the given tables (uses the sandbox PG* env vars). */
export async function loadPolicies(tables: string[]): Promise<PolicyRow[]> {
  if (cached) return cached.filter((p) => tables.includes(p.tablename));

  const client = new Client({ ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query<PolicyRow>(
      `SELECT tablename, policyname, cmd, roles, qual, with_check, permissive
         FROM pg_policies
        WHERE schemaname = 'public'`
    );
    cached = rows;
    return rows.filter((p) => tables.includes(p.tablename));
  } finally {
    await client.end();
  }
}

export async function rlsEnabled(table: string): Promise<boolean> {
  const client = new Client({ ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query<{ relrowsecurity: boolean }>(
      `SELECT c.relrowsecurity
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = $1`,
      [table]
    );
    return rows[0]?.relrowsecurity === true;
  } finally {
    await client.end();
  }
}

export async function tableGrants(table: string): Promise<Record<string, string[]>> {
  const client = new Client({ ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query<{ grantee: string; privilege_type: string }>(
      `SELECT grantee, privilege_type
         FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    return rows.reduce<Record<string, string[]>>((acc, r) => {
      acc[r.grantee] = [...(acc[r.grantee] ?? []), r.privilege_type];
      return acc;
    }, {});
  } finally {
    await client.end();
  }
}

/** Normalises whitespace so policy expressions can be matched with substrings. */
export const flat = (sql: string | null | undefined) =>
  (sql ?? '').replace(/\s+/g, ' ').trim();

export const ownershipViaEmployees = (expr: string) =>
  /employees/.test(expr) && /user_id = auth\.uid\(\)/.test(expr);

export const allowsRole = (expr: string, role: 'admin' | 'finance') =>
  new RegExp(`has_role\\(auth\\.uid\\(\\), '${role}'::app_role\\)`).test(expr) ||
  new RegExp(`user_roles[\\s\\S]*'${role}'::app_role`).test(expr);
