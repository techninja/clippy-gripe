#!/usr/bin/env node

/**
 * Applies patches from patches/ to node_modules after install.
 * @module scripts/apply-patches
 */

import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const patchDir = resolve(ROOT, 'patches');

for (const file of readdirSync(patchDir).filter((f) => f.endsWith('.patch'))) {
  const patch = resolve(patchDir, file);
  try {
    execSync(`patch -p0 --forward --reject-file=- -i ${patch}`, { cwd: ROOT, stdio: 'pipe' });
    console.log(`Applied: ${file}`);
  } catch {
    // --forward makes patch exit 1 if already applied — not an error
    console.log(`Skipped (already applied): ${file}`);
  }
}
