import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// This gate decides whether a secret reached version control, so it has to keep
// working on a messy checkout. The decision logic is exported and touches no
// filesystem, because a gate that throws is read as "the scan failed" rather
// than "a secret was found", and a gate that reports false failures gets routed
// around instead of fixed.

export const detectors = [
  {
    name: 'private-key',
    pattern: new RegExp(
      ['-----BEGIN ', '(?:RSA |EC |OPENSSH )?', 'PRIVATE KEY-----'].join(''),
      'u'
    )
  },
  { name: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/u },
  { name: 'google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/u },
  {
    name: 'github-token',
    pattern: new RegExp(`\\b${'gh'}[pousr]_[0-9A-Za-z]{20,}\\b`, 'u')
  },
  { name: 'slack-token', pattern: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/u },
  {
    name: 'jwt',
    pattern: /\beyJ[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}\b/u
  },
  {
    name: 'credential-in-url',
    pattern: /https?:\/\/[^/\s:@]+:[^/\s@]+@/iu
  },
  {
    name: 'credential-assignment',
    pattern:
      /(?:api[_-]?key|client[_-]?secret|password)\s*[:=]\s*['"][^'"]{12,}['"]/iu
  }
];

// This file necessarily contains every pattern it looks for, so scanning it
// would report itself on every run.
export const SELF_PATH = 'scripts/check-tracked-secrets.mjs';

export function detectSecrets(text, detectorList = detectors) {
  return detectorList
    .filter((detector) => detector.pattern.test(text))
    .map((detector) => detector.name);
}

export function isBinary(buffer) {
  return buffer.includes(0);
}

// `git ls-files` reads the index, so it lists files that are tracked but
// already deleted in the working tree. Those have no content to scan, and
// reading them throws ENOENT and takes the whole gate down. Skip them, and
// report how many were skipped so they are never silently assumed clean.
export function planScan(trackedFiles, exists) {
  const scan = [];
  const missing = [];
  for (const file of trackedFiles) {
    if (file === SELF_PATH) continue;
    if (exists(file)) scan.push(file);
    else missing.push(file);
  }
  return { scan, missing };
}

export function renderResult({ scannedCount, missing, failures }) {
  if (failures.length > 0) {
    return {
      ok: false,
      lines: failures.map((failure) => `${failure.file}: ${failure.detector}`)
    };
  }
  const skipped =
    missing.length > 0
      ? `, skipped ${missing.length} deleted in the working tree (${missing.join(', ')})`
      : '';
  return {
    ok: true,
    lines: [`Tracked-secret check passed for ${scannedCount} files${skipped}.`]
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
    encoding: 'utf8'
  })
    .split('\0')
    .filter(Boolean);

  const { scan, missing } = planScan(trackedFiles, existsSync);
  const failures = [];

  for (const file of scan) {
    const buffer = await readFile(file);
    if (isBinary(buffer)) continue;
    for (const detector of detectSecrets(buffer.toString('utf8'))) {
      failures.push({ file, detector });
    }
  }

  const result = renderResult({ scannedCount: scan.length, missing, failures });

  if (result.ok) {
    for (const line of result.lines) console.log(line);
  } else {
    for (const line of result.lines) console.error(line);
    process.exitCode = 1;
  }
}
