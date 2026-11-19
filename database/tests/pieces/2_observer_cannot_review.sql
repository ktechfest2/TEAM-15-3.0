-- Self-contained: builds throwaway fixtures, asserts, then raises 'PASS ...' so everything rolls back.
-- Any message starting with FAIL (or any other error) means the test failed. Run in the Supabase SQL editor.
-- 2. an observer cannot create a review
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
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  begin
    insert into public.reviews (polling_unit_id, reviewer_id, decision, note)
    values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'leave_open', 'x');
    raise exception 'FAIL observer created a review';
  exception when insufficient_privilege then null; end;
  reset role;
  raise exception 'PASS 2: observer review refused';
end $$;
