import { SubmissionReview } from "./submission-review";

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubmissionReview id={id} />;
}
