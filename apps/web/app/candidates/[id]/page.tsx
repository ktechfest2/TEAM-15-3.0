import { notFound } from "next/navigation";
import candidatesRaw from "../../../lib/data/candidates.json";
import { CandidateDetail } from "./detail";

export const dynamicParams = false;

export function generateStaticParams() {
  return (candidatesRaw.candidates as { id: string }[]).map((c) => ({ id: c.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(candidatesRaw.candidates as { id: string }[]).some((c) => c.id === id)) notFound();
  return <CandidateDetail id={id} />;
}
