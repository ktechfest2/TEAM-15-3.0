-- Run after schema.sql in the Supabase SQL editor. Each block raises on failure and prints nothing on success.
-- Uses a throwaway observer, reviewer and unit; everything is rolled back at the end.
begin;

insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'obs@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rev@test.local');
insert into public.profiles (id, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'observer'),
  ('00000000-0000-0000-0000-0000000000a2', 'reviewer');
insert into public.polling_units (id, code, name, ward, lga, state) values
  ('00000000-0000-0000-0000-0000000000b1', 'T-001', 'Test Unit', 'W', 'L', 'S');
insert into public.submissions (id, polling_unit_id, submitter_id, image_path, sha256_client, captured_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1',
   'a1/x.jpg', repeat('a', 64), now());

-- 1. public (anon) cannot read the submissions table, but can read the public view without a submitter column
set local role anon;
do $$ begin
  begin perform 1 from public.submissions; raise exception 'FAIL anon read submissions';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from information_schema.columns where table_name = 'submissions_public' and column_name = 'submitter_id') then
    raise exception 'FAIL submitter_id exposed in public view'; end if;
  perform 1 from public.submissions_public;
end $$;
reset role;

-- 2. observer cannot create a review
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$ begin
  begin
    insert into public.reviews (polling_unit_id, reviewer_id, decision, note)
    values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'leave_open', 'x');
    raise exception 'FAIL observer created a review';
  exception when insufficient_privilege or others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
reset role;

-- 3. reviewer can create a review
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
insert into public.reviews (polling_unit_id, reviewer_id, decision, note)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'leave_open', 'ok');
reset role;

-- 4. audit events cannot be updated or deleted, even by the owner
insert into public.audit_events (type, subject_id, payload, created_at, prev_hash, hash)
values ('t', 's', '{}', 'z', null, repeat('b', 64));
do $$ begin
  begin update public.audit_events set type = 'x'; raise exception 'FAIL audit update allowed';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin delete from public.audit_events; raise exception 'FAIL audit delete allowed';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
end $$;

-- 5. append_audit_event enforces the chain link
do $$ begin
  begin
    perform public.append_audit_event('{"type":"t","subject_id":"s","payload":{},"created_at":"z","prev_hash":null,"hash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}'::jsonb);
    raise exception 'FAIL bad link accepted';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
end $$;

rollback;
select 'rls tests passed' as result;
