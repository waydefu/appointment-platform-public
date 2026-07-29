import { execFileSync } from 'node:child_process';
import { extname } from 'node:path';
import { readFile } from 'node:fs/promises';

const files = execFileSync('git', ['ls-files', '-z'], {
  encoding: 'utf8'
})
  .split('\0')
  .filter(Boolean);

const deniedPrefixes = [
  'apps/web/',
  'docs/',
  'infra/',
  '.claude/',
  'output/',
  'test-results/'
];

const deniedExactPaths = new Set(['AGENTS.md']);
const deniedBinaryExtensions = new Set([
  '.7z',
  '.doc',
  '.docx',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.mov',
  '.mp4',
  '.pdf',
  '.png',
  '.ppt',
  '.pptx',
  '.rar',
  '.webp',
  '.xls',
  '.xlsx',
  '.zip'
]);

const privateMailProviders = ['gmail', 'hotmail', 'outlook', 'yahoo'].join('|');
const originalBrand = ['beau', 'essence'].join('');

const detectors = [
  {
    name: 'private-email-provider',
    pattern: new RegExp(
      `[A-Za-z0-9._%+-]+@(?:${privateMailProviders})\\.[A-Za-z]{2,}`,
      'iu'
    )
  },
  { name: 'taiwan-mobile-shape', pattern: /\b09[0-9]{8}\b/u },
  { name: 'taiwan-id-shape', pattern: /\b[A-Z][12][0-9]{8}\b/u },
  {
    name: 'windows-absolute-path',
    pattern: /\b[A-Za-z]:\\(?:Users|workspace|projects?)\\/iu
  },
  {
    name: 'unix-home-path',
    pattern: /\/(?:Users|home)\/[A-Za-z0-9._-]+\//u
  },
  {
    name: 'managed-preview-domain',
    pattern: new RegExp(['\\.', '(?:web|firebaseapp)', '\\.app'].join(''), 'iu')
  },
  {
    name: 'internal-decision-id',
    pattern: /\bD-[0-9]{3}\b/u
  },
  {
    name: 'original-brand',
    pattern: new RegExp(originalBrand, 'iu')
  }
];

const failures = [];

for (const file of files) {
  const normalized = file.replaceAll('\\', '/');
  if (
    deniedExactPaths.has(normalized) ||
    deniedPrefixes.some((prefix) => normalized.startsWith(prefix))
  ) {
    failures.push({ file, detector: 'denied-path' });
    continue;
  }

  if (deniedBinaryExtensions.has(extname(normalized).toLowerCase())) {
    failures.push({ file, detector: 'unapproved-binary' });
    continue;
  }

  if (normalized === 'scripts/check-public-safety.mjs') continue;
  const buffer = await readFile(file);
  if (buffer.includes(0)) {
    failures.push({ file, detector: 'unexpected-binary-content' });
    continue;
  }

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
  console.log(`Publication-safety check passed for ${files.length} files.`);
}
