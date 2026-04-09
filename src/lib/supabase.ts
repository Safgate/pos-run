import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const candidateRoots = [
  process.env.APP_ROOT,
  process.cwd(),
  path.dirname(process.execPath),
  process.resourcesPath,
].filter((v): v is string => Boolean(v && String(v).trim()));

for (const root of candidateRoots) {
  dotenv.config({ path: path.join(root, '.env') });
  dotenv.config({ path: path.join(root, '.env.local'), override: true });
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env or .env.local in the project root (copy from .env.example).',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
