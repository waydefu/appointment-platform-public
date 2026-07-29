import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const files = execFileSync('git', ['ls-files', '-z'], {
  encoding: 'utf8'
})
  .split('\0')
  .filter(Boolean);

const detectors = [
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

const failures = [];

for (const file of files) {
  if (file === 'scripts/check-tracked-secrets.mjs') continue;
  const buffer = await readFile(file);
  if (buffer.includes(0)) continue;
  const text = buffer.toString('utf8');

  for (const detector of detectors) {
    if (detector.pattern.test(text)) {
      failures.push({ file, detector: detector.name });
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`${failure.file}: ${failure.detector}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Tracked-secret check passed for ${files.length} files.`);
}
