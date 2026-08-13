import type { Reporter, TestModule, TestCase } from 'vitest/node';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Vitest reporter that turns failed security regression assertions into
 * GitHub Actions annotations on the pull request, including the exact
 * RLS rule / role assertion that failed (table, policy, expected vs received).
 */

interface Failure {
  file: string;
  name: string;
  line?: number;
  message: string;
  expected?: string;
  actual?: string;
  detail?: string;
}

const esc = (s: string) =>
  s
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Pulls "<table>.<policy>" / role names out of the assertion message. */
function ruleHint(message: string): string | undefined {
  const policy = message.match(
    /([a-z_]+)\.([A-Za-z0-9_ -]+?) (?:ownership check|is unscoped|roles|qual|with_check)/
  );
  if (policy) return `policy ${policy[1]}.${policy[2].trim()}`;
  const table = message.match(/\b(attendances|sale_items|sales)\b/);
  const role = message.match(/\b(admin|finance|staff|anon|anonymous|authenticated)\b/);
  return (
    [table?.[1] && `table ${table[1]}`, role?.[1] && `role ${role[1]}`]
      .filter(Boolean)
      .join(', ') || undefined
  );
}

function firstProjectFrame(stack?: string): number | undefined {
  const m = stack?.match(/tests\/[^\s:)]+:(\d+):\d+/);
  return m ? Number(m[1]) : undefined;
}

export default class SecurityAnnotationsReporter implements Reporter {
  private root = process.cwd();

  onTestRunEnd(testModules: readonly TestModule[] = []) {
    const failures: Failure[] = [];

    for (const mod of testModules) {
      const file = path.relative(this.root, mod.moduleId ?? '');
      for (const test of mod.children.allTests() as Iterable<TestCase>) {
        const result = test.result();
        if (result.state !== 'failed') continue;
        const errors = result.errors?.length ? result.errors : [{ message: 'unknown failure' } as any];
        for (const err of errors) {
          const message = oneLine(err.message ?? '');
          failures.push({
            file,
            name: test.fullName,
            line: firstProjectFrame(err.stack),
            message,
            expected: err.expected !== undefined ? oneLine(String(err.expected)) : undefined,
            actual: err.actual !== undefined ? oneLine(String(err.actual)) : undefined,
            detail: ruleHint(`${test.fullName} ${message}`),
          });
        }
      }
    }

    // GitHub Actions annotations (rendered inline on the PR diff).
    for (const f of failures) {
      const title = `Security rule failed: ${f.detail ?? f.name}`;
      const body = [
        f.name,
        f.detail ? `Rule: ${f.detail}` : undefined,
        `Assertion: ${f.message}`,
        f.expected !== undefined ? `Expected: ${f.expected}` : undefined,
        f.actual !== undefined ? `Received: ${f.actual}` : undefined,
      ]
        .filter(Boolean)
        .join('\n');
      console.log(
        `::error file=${f.file}${f.line ? `,line=${f.line}` : ''},title=${esc(title)}::${esc(body)}`
      );
    }

    // Markdown summary for the job page and the PR comment.
    const md = failures.length
      ? [
          '### ❌ Security regression failures',
          '',
          '| Rule / role | Test | Assertion | Expected | Received | Location |',
          '| --- | --- | --- | --- | --- | --- |',
          ...failures.map((f) => {
            const cell = (v?: string) => (v ? v.replace(/\|/g, '\\|') : '—');
            return `| ${cell(f.detail)} | ${cell(f.name)} | ${cell(f.message)} | ${cell(f.expected)} | ${cell(f.actual)} | \`${f.file}${f.line ? `:${f.line}` : ''}\` |`;
          }),
        ].join('\n')
      : '### ✅ All security regression rules passed (RLS enabled, role scoping, anonymous access).';

    mkdirSync(path.join(this.root, 'test-results'), { recursive: true });
    writeFileSync(path.join(this.root, 'test-results/security-summary.md'), `${md}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
    }
  }
}
