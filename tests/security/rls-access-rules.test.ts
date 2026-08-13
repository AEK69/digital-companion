import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadPolicies,
  rlsEnabled,
  tableGrants,
  flat,
  ownershipViaEmployees,
  allowsRole,
  hasDbAccess,
  type PolicyRow,
} from '../helpers/policies';

/**
 * Security regression tests for attendance / wage-bonus and sales financial data.
 *
 * These assert the *access rules themselves* (RLS enabled, no anonymous role on
 * policies, ownership + admin/finance scoping), so a future migration that
 * re-opens these tables fails the suite.
 */

const TABLES = ['attendances', 'sales', 'sale_items'];

const d = hasDbAccess ? describe : describe.skip;

d('RLS access rules: attendance, wage/bonus and sales data', () => {
  let policies: PolicyRow[] = [];
  const forTable = (t: string) => policies.filter((p) => p.tablename === t);
  const selectPolicies = (t: string) =>
    forTable(t).filter((p) => p.cmd === 'SELECT' || p.cmd === 'ALL');

  beforeAll(async () => {
    policies = await loadPolicies(TABLES);
  });

  describe.each(TABLES)('table %s', (table) => {
    it('has row level security enabled', async () => {
      expect(await rlsEnabled(table)).toBe(true);
    });

    it('has at least one policy (a table with RLS and no policy is unusable)', () => {
      expect(forTable(table).length).toBeGreaterThan(0);
    });

    it('grants no privileges to the anonymous role', async () => {
      const grants = await tableGrants(table);
      expect(grants.anon ?? []).toEqual([]);
    });

    it('never allows anonymous users through a policy expression', () => {
      for (const p of forTable(table)) {
        const expr = `${flat(p.qual)} ${flat(p.with_check)}`;
        // Anonymous users have a null auth.uid(); every rule must depend on it.
        expect(expr, `${table}.${p.policyname}`).toMatch(/auth\.uid\(\)/);
        expect(expr, `${table}.${p.policyname}`).not.toMatch(/^\s*true\s*$/);
      }
    });
  });

  describe('attendances (wage, bonus, hours)', () => {
    it('read access is limited to the owning employee, admin or finance', () => {
      const reads = selectPolicies('attendances');
      expect(reads.length).toBeGreaterThan(0);
      for (const p of reads) {
        const expr = flat(p.qual);
        expect(ownershipViaEmployees(expr), `${p.policyname} ownership check`).toBe(true);
      }
      const combined = reads.map((p) => flat(p.qual)).join(' ');
      expect(allowsRole(combined, 'admin')).toBe(true);
      expect(allowsRole(combined, 'finance')).toBe(true);
    });

    it('has no policy that lets a staff user read other employees rows', () => {
      for (const p of forTable('attendances')) {
        const expr = flat(p.qual);
        if (!expr) continue;
        const ownership = ownershipViaEmployees(expr);
        const roleGated = allowsRole(expr, 'admin') || allowsRole(expr, 'finance');
        expect(ownership || roleGated, `${p.policyname} is unscoped`).toBe(true);
      }
    });

    it('writes are restricted to authenticated users only', () => {
      const writes = forTable('attendances').filter((p) =>
        ['ALL', 'INSERT', 'UPDATE', 'DELETE'].includes(p.cmd)
      );
      for (const p of writes) {
        expect(p.roles, `${p.policyname} roles`).toEqual(['authenticated']);
      }
    });
  });

  describe('sales and sale_items (financial data)', () => {
    it('read access is limited to own sales, admin or finance', () => {
      for (const table of ['sales', 'sale_items']) {
        const reads = selectPolicies(table);
        expect(reads.length, `${table} has a read policy`).toBeGreaterThan(0);
        const combined = reads.map((p) => flat(p.qual)).join(' ');
        expect(combined, `${table} scopes to employee`).toMatch(/employee_id|employees/);
        expect(allowsRole(combined, 'admin'), `${table} admin`).toBe(true);
        expect(allowsRole(combined, 'finance'), `${table} finance`).toBe(true);
      }
    });

    it('destructive management of sales is admin-gated on read and write sides', () => {
      const manage = forTable('sales').filter((p) => p.cmd === 'ALL');
      expect(manage.length).toBeGreaterThan(0);
      for (const p of manage) {
        expect(allowsRole(flat(p.qual), 'admin'), `${p.policyname} qual`).toBe(true);
        expect(allowsRole(flat(p.with_check), 'admin'), `${p.policyname} with_check`).toBe(true);
      }
    });

    it('sale creation requires a user with an assigned role', () => {
      const inserts = policies.filter(
        (p) => ['sales', 'sale_items'].includes(p.tablename) && p.cmd === 'INSERT'
      );
      expect(inserts.length).toBeGreaterThan(0);
      for (const p of inserts) {
        expect(flat(p.with_check), `${p.tablename}.${p.policyname}`).toMatch(
          /user_roles[\s\S]*auth\.uid\(\)/
        );
      }
    });
  });
});
