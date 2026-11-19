-- Self-contained: builds throwaway fixtures, asserts, then raises 'PASS ...' so everything rolls back.
-- Any message starting with FAIL (or any other error) means the test failed. Run in the Supabase SQL editor.
-- 5. append_audit_event refuses a bad prev_hash and accepts the right one
do $$ begin
  insert into public.audit_events (type, subject_id, payload, created_at, prev_hash, hash)
  values ('t', 's', '{}', 'z', null, repeat('b', 64));
  begin
    perform public.append_audit_event('{"type":"t","subject_id":"s","payload":{},"created_at":"z","prev_hash":null,"hash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}'::jsonb);
    raise exception 'FAIL bad link accepted';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  perform public.append_audit_event(('{"type":"t","subject_id":"s","payload":{},"created_at":"z","prev_hash":"' || repeat('b', 64) || '","hash":"' || repeat('c', 64) || '"}')::jsonb);
  raise exception 'PASS 5: chain link enforced, valid link accepted';
end $$;
