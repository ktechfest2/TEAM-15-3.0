# Database tests

Run each file in `pieces/` in the Supabase SQL editor, in order. Each is one self-contained `DO` block that builds throwaway fixtures, asserts, then raises `PASS n: ...` so the whole thing rolls back. The editor shows that as an "error"; the message starting with `PASS` is success. Anything starting with `FAIL`, or any other error, is a failure.

(The earlier single-script version used an explicit begin/rollback with role switching and hung the dashboard editor, so it was split.)

1. anon cannot read `submissions`; the public view hides `submitter_id`
2. an observer cannot create a review
3. a reviewer can create and read back a review
4. `audit_events` refuses update, delete and truncate
5. `append_audit_event` refuses a bad `prev_hash` and accepts the correct one
