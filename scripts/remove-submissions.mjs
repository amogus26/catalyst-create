#!/usr/bin/env node
/**
 * Removes submissions by display name, rows and stored images alike:
 * `node scripts/remove-submissions.mjs "Type Test"`.
 *
 * For clearing out test submissions. It is deliberately not something the site can do - taking a
 * design down is `/admin`'s job, which keeps the row and the file so a mistake can be undone.
 * This is the shovel for when you actually want them gone.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      if (!process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fall back to the ambient environment */
  }
}

loadEnvLocal();

const name = process.argv[2];
if (!name) {
  console.error('Usage: node scripts/remove-submissions.mjs "<display name>"');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET ?? "submissions";
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false } });

const { data: rows, error } = await client
  .from("submissions")
  .select("id, display_name, image_path, status")
  .eq("display_name", name);

if (error) {
  console.error("Could not read submissions:", error.message);
  process.exit(1);
}
if (!rows || rows.length === 0) {
  console.log(`Nothing named "${name}".`);
  process.exit(0);
}

const paths = rows.map((row) => row.image_path);
const removed = await client.storage.from(bucket).remove(paths);
if (removed.error) console.warn("Some images could not be removed:", removed.error.message);

const deleted = await client.from("submissions").delete().eq("display_name", name);
if (deleted.error) {
  console.error("Could not delete rows:", deleted.error.message);
  process.exit(1);
}

console.log(`Removed ${rows.length} submission(s) named "${name}" and their images.`);
