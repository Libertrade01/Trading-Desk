#!/usr/bin/env node
/**
 * One-time setup: copy production env from trading-desk → libertrade-app
 * with customer feature flags and app URL. Run from repo root.
 */
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ENV = join(ROOT, '.env.founder.prod.tmp');
const CUSTOMER_PROJECT = 'libertrade-app';
const CUSTOMER_URL = 'https://libertrade-app.vercel.app';

const COPY_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'FOUNDER_EMAIL',
  'CRON_SECRET',
  'FMP_API_KEY',
  'SIFTING_API_KEY',
];

const CUSTOMER_OVERRIDES = {
  NEXT_PUBLIC_APP_URL: CUSTOMER_URL,
  NEXT_PUBLIC_FEATURE_WIKI: 'false',
  NEXT_PUBLIC_FEATURE_LEGACY_DESK: 'false',
  AUTH_DISABLED: 'false',
};

function parseEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function vercel(args, input) {
  const result = spawnSync('npx', ['vercel', ...args], {
    cwd: ROOT,
    input,
    encoding: 'utf8',
    shell: true,
    env: { ...process.env, NODE_OPTIONS: '--use-system-ca' },
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

function linkProject(name) {
  vercel(['link', '--project', name, '--yes']);
}

function addEnv(key, value, environment = 'production') {
  const add = spawnSync(
    'npx',
    ['vercel', 'env', 'add', key, environment, '--yes'],
    {
      cwd: ROOT,
      input: value,
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, NODE_OPTIONS: '--use-system-ca' },
    }
  );
  if (add.status !== 0) {
    const err = (add.stderr || add.stdout || '').toLowerCase();
    if (err.includes('already exists')) {
      spawnSync(
        'npx',
        ['vercel', 'env', 'update', key, environment, '--yes'],
        {
          cwd: ROOT,
          input: value,
          encoding: 'utf8',
          shell: true,
          env: { ...process.env, NODE_OPTIONS: '--use-system-ca' },
        }
      );
      console.log(`updated ${key}`);
      return;
    }
    console.error(add.stderr || add.stdout);
    process.exit(add.status ?? 1);
  }
  console.log(`added ${key}`);
}

if (!existsSync(SOURCE_ENV)) {
  console.error(`Missing ${SOURCE_ENV}. Run: vercel env pull .env.founder.prod.tmp --environment production -y`);
  process.exit(1);
}

const source = parseEnvFile(SOURCE_ENV);
const toSet = { ...CUSTOMER_OVERRIDES };
for (const key of COPY_KEYS) {
  if (source[key]) toSet[key] = source[key];
}

console.log('Linking libertrade-app…');
linkProject(CUSTOMER_PROJECT);

console.log('Setting production environment variables…');
for (const [key, value] of Object.entries(toSet)) {
  addEnv(key, value);
}

console.log('Connecting GitHub repository…');
vercel(['git', 'connect', 'https://github.com/Libertrade01/Trading-Desk.git']);

try {
  unlinkSync(SOURCE_ENV);
} catch {
  /* ignore */
}

console.log('Done. Deploy with: npx vercel --prod --project libertrade-app');
