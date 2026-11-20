# Problem brief: Every Vote, Every Voice

**Team 15 · VOTE-GUARD 360 · demo data only**

## The problem

After a vote, the number that matters is written on one sheet of paper at each polling unit. People who want to check the count depend on that sheet: observers, journalists, party agents, citizens. Three things go wrong.

1. **Evidence is easy to doubt and hard to defend.** A photo sent over a messaging app has no proof of when it was taken, whether it was edited, or who sent it. Two photos of the same sheet can show different numbers and nobody can say why.
2. **Checking is slow and inconsistent.** Adding up a sheet, comparing it with another, and noticing the one figure that differs is manual work, done late, by a few people.
3. **Many people are shut out of the evidence.** A sheet is dense. Voters with low literacy, low vision, or no data signal cannot read it, and most tools assume a fast connection and fluent English.

## Who is affected

Observers working on patchy connections. Voters and journalists who cannot read a dense table. Reviewers who need to see exactly what differs. Everyone who needs to trust a number without being told to.

## What we built

An **independent evidence layer** for result sheets. It is not an INEC system. It does not collate or declare results, and it never says "fraud", "correct" or "winner".

- **Capture** on a phone with a fingerprint (SHA-256) taken on the device, even with no signal. Photos wait on the phone and upload when a connection returns.
- **Keep the original**: write-once storage. The server re-hashes the stored file and flags any mismatch.
- **Read and check**: figures are read from the photo (machine-assisted, with a confidence flag), then the arithmetic is checked: parties add up to valid votes, valid plus rejected equals cast, cast is not above accredited, accredited is not above registered.
- **Compare independent photos**: two photos count as independent only if they come from different people and are different files. The differing figure is highlighted.
- **Human review**: a reviewer sees the photos side by side and records a decision and a public note.
- **Neutral public status**: Waiting, Needs a person to check, Two people agree, Photos differ, Checked by a reviewer.
- **Tamper-evident history**: every step is an event linked to the one before it; anyone can run a check on the whole chain.
- **Access layer**: "Listen to this result sheet", an accessibility mode (large text, high contrast, reduced motion, slow voice, keyboard and screen-reader friendly), and easy-read status sentences in English and Nigerian Pidgin.

## What a fingerprint does and does not prove

It proves the file is the same as when it was captured. It does **not** prove the document was genuine. The app says so wherever a fingerprint is shown.

## Honest limits

The result-sheet data (polling units, sheets, figures) is synthetic and labelled DEMO. The voter guide uses real public records, each with a source. Reading figures from photos is machine-assisted and can be wrong; uncertain values go to a person. In this build the reader serves stored results for the three demo sheets and flags any other image as unreadable for human review; the live model call is a stub until a key is supplied. Pidgin text needs a native-speaker check. No Pidgin voice exists on phones, so Pidgin is text only.
