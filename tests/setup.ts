// Loaded first via `--import` in the npm test script. Unit tests must never
// touch a real database, even if the developer's shell exports Supabase vars.
for (const k of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]) {
  delete process.env[k];
}
