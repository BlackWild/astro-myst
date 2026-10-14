import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MystLogger } from '../src/types.js';

export const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));
export const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url));

/** Copy a fixture MyST project into a fresh temp folder (tests must not write into the repo). */
export function copyFixture(name: string): string {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), `astro-myst-${name}-`));
  fs.cpSync(path.join(FIXTURES, name), dest, { recursive: true });
  return dest;
}

export function memoryLogger() {
  const messages: { level: keyof MystLogger; msg: string }[] = [];
  const logger: MystLogger = {
    info: (msg) => messages.push({ level: 'info', msg }),
    warn: (msg) => messages.push({ level: 'warn', msg }),
    error: (msg) => messages.push({ level: 'error', msg }),
    debug: (msg) => messages.push({ level: 'debug', msg }),
  };
  return { logger, messages };
}
