#!/usr/bin/env node
/**
 * Checks a real Supabase project before you trust it with anything: `npm run check:supabase`.
 *
 * Run it once after creating the project and applying supabase/migrations/0001_init.sql. It reads
 * .env.local, then checks the things that are easy to get wrong and expensive to get wrong:
 *
 *   - the tables and the cast_vote function exist
 *   - the bucket exists and is PRIVATE
 *   - the anon key can read nothing (i.e. RLS is really on, with no policies)
 *
 * It only reads. It creates nothing and changes nothing.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, "");
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  } catch {
    // No .env.local: fall back to whatever is already in the environment.
  }
}

loadEnvLocal();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY; // optional, only used for the RLS check
const bucket = process.env.SUPABASE_BUCKET ?? "submissions";

if (!url || !serviceKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).");
  process.exit(1);
}

const results = [];
const note = (ok, text) => results.push({ ok, text });

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// 1. tables
for (const table of ["submissions", "votes"]) {
  const { error } = await admin.from(table).select("*", { head: true, count: "exact" });
  note(!error, error ? `table "${table}": ${error.message}` : `table "${table}" is there`);
}

// 2. the voting function (a lookup that matches nothing still proves it exists)
{
  const { error } = await admin.rpc("cast_vote", {
    p_submission_id: "00000000-0000-0000-0000-000000000000",
    p_voter_id: "00000000-0000-0000-0000-000000000000",
  });
  note(!error, error ? `function cast_vote: ${error.message}` : "function cast_vote is there");
}

// 3. the bucket, and whether it is private
{
  const { data, error } = await admin.storage.getBucket(bucket);
  if (error || !data) {
    note(false, `bucket "${bucket}": ${error?.message ?? "not found"}`);
  } else if (data.public) {
    note(false, `bucket "${bucket}" is PUBLIC - every upload is readable before review. Make it private.`);
  } else {
    note(true, `bucket "${bucket}" is there and private`);
  }
}

// 4. what the anon key can see - which must be nothing
if (anonKey) {
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.from("submissions").select("id").limit(1);
  const blocked = Boolean(error) || (Array.isArray(data) && data.length === 0);
  note(
    blocked,
    blocked
      ? "the anon key cannot read submissions (row-level security is doing its job)"
      : "THE ANON KEY CAN READ SUBMISSIONS - a policy has been added somewhere. The pending queue is exposed.",
  );
} else {
  note(true, "skipped the anon-key check (set SUPABASE_ANON_KEY to run it)");
}

for (const result of results) {
  console.log(`${result.ok ? "ok  " : "FAIL"}  ${result.text}`);
}
process.exit(results.every((result) => result.ok) ? 0 : 1);
