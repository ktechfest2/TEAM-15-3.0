-- Self-contained: builds throwaway fixtures, asserts, then raises 'PASS ...' so everything rolls back.
-- Any message starting with FAIL (or any other error) means the test failed. Run in the Supabase SQL editor.
-- 4. audit events cannot be updated, deleted or truncated, even by the owner role
do $$ begin
  insert into public.audit_events (type, subject_id, payload, created_at, prev_hash, hash)
  values ('t', 's', '{}', 'z', null, repeat('b', 64));
  begin update public.audit_events set type = 'x'; raise exception 'FAIL audit update allowed';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin delete from public.audit_events; raise exception 'FAIL audit delete allowed';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin truncate public.audit_events; raise exception 'FAIL audit truncate allowed';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  raise exception 'PASS 4: audit_events refuses update, delete and truncate';
end $$;
