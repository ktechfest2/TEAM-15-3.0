-- Self-contained: builds throwaway fixtures, asserts, then raises 'PASS ...' so everything rolls back.
-- Any message starting with FAIL (or any other error) means the test failed. Run in the Supabase SQL editor.
-- 3. a reviewer can create a review and read it back
do $$ declare n int; begin
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
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
  insert into public.reviews (polling_unit_id, reviewer_id, decision, note)
  values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'leave_open', 'ok');
  select count(*) into n from public.reviews;
  reset role;
  if n <> 1 then raise exception 'FAIL reviewer could not insert or read back review (n=%)', n; end if;
  raise exception 'PASS 3: reviewer can create a review';
end $$;
