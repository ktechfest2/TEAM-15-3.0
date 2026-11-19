import { Explorer } from "./explorer";

export default function Home() {
  return (
    <main>
      <h1>Find a polling unit</h1>
      <p className="sub">Pick a place, or search by unit code or name. All units here are synthetic demo data.</p>
      <Explorer />
    </main>
  );
}
