import { redirect } from "next/navigation";

/** There is no separate home page: the site opens on the candidates. */
export default function Home() {
  redirect("/candidates");
}
