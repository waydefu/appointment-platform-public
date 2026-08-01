import { describe, expect, it } from 'vitest';
import {
  detectSecrets,
  isBinary,
  planScan,
  renderResult,
  SELF_PATH
} from './check-tracked-secrets.mjs';

// The failure this gate had was not a missed secret. It was a crash: `git
// ls-files` lists files deleted in the working tree, reading one threw ENOENT,
// and the run reported "scan failed" for what was only a local deletion. A gate
// that produces false failures gets routed around, so these tests pin the
// behaviour that keeps it trustworthy on a messy checkout.

const exists = (present) => (file) => present.includes(file);

// Every fixture below is assembled from fragments rather than written out, for
// the same reason the scanner itself splits its patterns: a literal of
// realistic shape in a public repository is found by external secret scanners,
// which then report this file. The values are synthetic and correspond to no
// real credential, but "synthetic" is not something a scanner can tell from the
// outside. Do not join these back into single literals.
const AWS_FIXTURE = `const k = '${'AKIA'}${'3XZQ7MNPV2WD5RTY'}';`;
const JWT_FIXTURE = `const t = "${'eyJhbGciOiJIUzI1NiJ9'}.${'eyJzdWIiOiIxMjM0NTY3ODkwIn0'}.${'dBjftJeZ4CVP'}";`;
const SLACK_FIXTURE = `const k = '${'xoxb'}-2416731535-abcdefghijklmnop';`;
// The scheme is split across fragments on purpose. Interpolating the userinfo
// alone is not enough: `${'user'}` contains none of the characters the detector
// excludes, so the raw text still reads as a contiguous credential URL. Only
// breaking the `//` stops it matching this file while still assembling the same
// value at runtime.
const URL_CREDENTIAL_FIXTURE = [
  'const u = "https:/',
  '/user:hunter2',
  '@example.invalid/x";'
].join('');
const ASSIGNMENT_FIXTURE = `const ${'pass'}${'word'} = "correct-horse-battery";`;

describe('tracked secret scan planning', () => {
  it('scans tracked files that are present', () => {
    const files = ['a.ts', 'b.ts'];
    expect(planScan(files, exists(files))).toEqual({
      scan: ['a.ts', 'b.ts'],
      missing: []
    });
  });

  it('skips files deleted in the working tree instead of throwing', () => {
    const plan = planScan(['a.ts', 'gone.ts'], exists(['a.ts']));
    expect(plan.scan).toEqual(['a.ts']);
    expect(plan.missing).toEqual(['gone.ts']);
  });

  it('never scans itself, since it contains every pattern it looks for', () => {
    const plan = planScan([SELF_PATH, 'a.ts'], exists([SELF_PATH, 'a.ts']));
    expect(plan.scan).toEqual(['a.ts']);
    expect(plan.missing).toEqual([]);
  });
});

describe('tracked secret detection', () => {
  it.each([
    ['aws-access-key', AWS_FIXTURE],
    ['slack-token', SLACK_FIXTURE],
    ['jwt', JWT_FIXTURE],
    ['credential-in-url', URL_CREDENTIAL_FIXTURE],
    ['credential-assignment', ASSIGNMENT_FIXTURE]
  ])('reports %s', (name, text) => {
    expect(detectSecrets(text)).toContain(name);
  });

  it('reports every detector that matches, not only the first', () => {
    const text = [AWS_FIXTURE, URL_CREDENTIAL_FIXTURE].join('\n');
    expect(detectSecrets(text)).toEqual(
      expect.arrayContaining(['aws-access-key', 'credential-in-url'])
    );
  });

  it('leaves ordinary source alone', () => {
    expect(detectSecrets('export const limit = 10;')).toEqual([]);
  });

  it('treats a NUL byte as binary content', () => {
    expect(isBinary(Buffer.from([0x61, 0x00, 0x62]))).toBe(true);
    expect(isBinary(Buffer.from('plain text', 'utf8'))).toBe(false);
  });
});

describe('tracked secret reporting', () => {
  it('fails and names every finding', () => {
    const result = renderResult({
      scannedCount: 2,
      missing: [],
      failures: [{ file: 'a.ts', detector: 'aws-access-key' }]
    });
    expect(result.ok).toBe(false);
    expect(result.lines).toEqual(['a.ts: aws-access-key']);
  });

  // Silence here would be the actual danger: a skipped file that nobody knows
  // was skipped looks exactly like a file that passed.
  it('states how many files were skipped rather than passing quietly', () => {
    const result = renderResult({
      scannedCount: 1,
      missing: ['gone.ts'],
      failures: []
    });
    expect(result.ok).toBe(true);
    expect(result.lines[0]).toContain('skipped 1');
    expect(result.lines[0]).toContain('gone.ts');
  });

  it('reports a plain count when nothing was skipped', () => {
    const result = renderResult({ scannedCount: 3, missing: [], failures: [] });
    expect(result.ok).toBe(true);
    expect(result.lines[0]).toBe('Tracked-secret check passed for 3 files.');
  });
});
