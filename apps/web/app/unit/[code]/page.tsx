import { UnitView } from "./unit-view";

export default async function UnitPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <UnitView code={decodeURIComponent(code)} />;
}
