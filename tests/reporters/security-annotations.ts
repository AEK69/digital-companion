import type { Reporter } from 'vitest/node';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Vitest reporter that turns failed security regression assertions into
 * GitHub Actions annotations on the pull request, including the exact
 * RLS rule / role assertion that failed (table, policy, expected vs received).
 */

interface Failure {
  file: string;
  suite: string;
  test: string;
  line?: number;
  message: string;
  expected?: string;
  actual?: string;
  detail?: string;
}

const esc = (s: string) =>
  s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/:/g, '%3A').replace(/,/g, '%2C');

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Pulls "<table>.<policy>" / role names out of the assertion message. */
function ruleHint(message: string): string | undefined {
  const policy = message.match(/([a-z_]+)\.([A-Za-z0-9_ -]+) (?:ownership check|is unscoped|roles|qual|with_check)/);
  if (policy) return `policy ${policy[1]}.${policy[2]}`;
  const table = message.match(/\b(attendances|sales|sale_items)\b/);
  const role = message.match(/\b(admin|finance|staff|anon|authenticated)\b/);
  return [table?.[1] && `table ${table[1]}`, role?.[1] && `role ${role[1]}`].filter(Boolean).join(', ') || undefined;
}

function firstProjectFrame(stack?: string): number | undefined {
  const m = stack?.match(/tests\/[^\s:)]+:(\d+):\d+/);
  return m ? Number(m[1]) : undefined;
}

export default class SecurityAnnotationsReporter implements Reporter {
  private root = process.cwd();

  onFinished(files: any[] = []) {
    const failures: Failure[] = [];

    const walk = (task: any, file: string, trail: string[]) => {
      if (task.type === 'suite') {
        for (const child of task.tasks ?? []) walk(child, file, [...trail, task.name].filter(Boolean));
        return;
      }
      if (task.result?.state !== 'fail') return;
      for (const err of task.result.errors ?? [{ message: 'unknown failure' }]) {
        failures.push({
          file,
          suite: trail.join(' > '),
          test: task.name,
          line: firstProjectFrame(err.stack),
          message: oneLine(err.message ?? ''),
          expected: err.expected !== undefined ? oneLine(String(err.expected)) : undefined,
          actual: err.actual !== undefined ? oneLine(String(err.actual)) : undefined,
          detail: ruleHint(oneLine(`${task.name} ${err.message ?? ''}`)),
        });
      }
    };

    for (const f of files) {
      const rel = path.relative(this.root, f.filepath ?? f.name ?? '');
      for (const t of f.tasks ?? []) walk(t, rel, []);
    }

    // GitHub Actions annotations (rendered inline on the PR).
    for (const f of failures) {
      const title = `Security rule failed: ${f.detail ?? (f.suite || f.test)}`;
      const body = [
        `${f.suite ? `${f.suite} > ` : ''}${f.test}`,
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

    // Markdown summary for the job page / PR comment.
    const md = failures.length
      ? [
          '### ❌ Security regression failures',
          '',
          '| Rule / role | Test | Assertion | Location |',
          '| --- | --- | --- | --- |',
          ...failures.map(
            (f) =>
              `| ${f.detail ?? '—'} | ${f.suite ? `${f.suite} > ` : ''}${f.test} | ${f.message.replace(/\|/g, '\\|')} | \`${f.file}${f.line ? `:${f.line}` : ''}\` |`
          ),
        ].join('\n')
      : '### ✅ All security regression rules passed (RLS policies, role scoping, anonymous access).';

    mkdirSync(path.join(this.root, 'test-results'), { recursive: true });
    writeFileSync(path.join(this.root, 'test-results/security-summary.md'), `${md}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
    }
  }
}
