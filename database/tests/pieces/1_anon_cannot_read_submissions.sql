-- Self-contained: builds throwaway fixtures, asserts, then raises 'PASS ...' so everything rolls back.
-- Any message starting with FAIL (or any other error) means the test failed. Run in the Supabase SQL editor.
-- 1. anon cannot read submissions, and the public view has no submitter column
do $$ begin
  insert into auth.users (id, instance_id, aud, role, email) values
    ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'obs@test.local'),
    ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rev@test.local');
  insert into public.profiles (id, role) values
    ('00000000-0000-0000-0000-0000000000a1', 'observer'),
    ('00000000-0000-0000-0000-0000000000a2', 'reviewer');
  insert into public.polling_units (id, code, name, ward, lga, state) values
    ('00000000-0000-0000-0000-0000000000b1', 'T-001', 'Test Unit', 'W', 'L', 'S');
  insert into public.submissions (id, polling_unit_id, submitter_id, image_path, sha256_client, captured_at) values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'a1/x.jpg', repeat('a', 64), now());
  set local role anon;
  begin perform 1 from public.submissions; raise exception 'FAIL anon read submissions';
  exception when insufficient_privilege then null; end;
  perform 1 from public.submissions_public;
  reset role;
  if exists (select 1 from information_schema.columns where table_name = 'submissions_public' and column_name = 'submitter_id') then
    raise exception 'FAIL submitter_id exposed in public view'; end if;
  raise exception 'PASS 1: anon blocked from submissions, public view hides submitter_id';
end $$;
