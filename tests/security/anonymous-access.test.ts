import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Black-box regression test: an anonymous (not signed in) client must not be
 * able to read attendance/wage or sales financial data through the Data API.
 */

function env(): Record<string, string> {
  const vars: Record<string, string> = { ...process.env } as Record<string, string>;
  const file = path.resolve(process.cwd(), '.env');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m && !vars[m[1]]) vars[m[1]] = m[2];
    }
  }
  return vars;
}

const e = env();
const url = e.VITE_SUPABASE_URL;
const key = e.VITE_SUPABASE_PUBLISHABLE_KEY;
const d = url && key ? describe : describe.skip;

async function anonSelect(table: string) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=5`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const body = await res.text();
  return { status: res.status, body };
}

d('anonymous users cannot read protected data', () => {
  it.each(['attendances', 'sales', 'sale_items'])(
    '%s returns no rows for an anonymous client',
    async (table) => {
      const { status, body } = await anonSelect(table);
      if (status === 200) {
        expect(JSON.parse(body)).toEqual([]);
      } else {
        // 401/403 from RLS or missing grants is also an acceptable outcome.
        expect([401, 403, 404]).toContain(status);
      }
    }
  );

  it('anonymous clients cannot insert a sale', async () => {
    const res = await fetch(`${url}/rest/v1/sales`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sale_number: `TEST-${Date.now()}`,
        total_amount: 1,
        discount_amount: 0,
        final_amount: 1,
        payment_method: 'cash',
        status: 'completed',
      }),
    });
    expect(res.status).not.toBe(201);
    expect([401, 403]).toContain(res.status);
  });
});
