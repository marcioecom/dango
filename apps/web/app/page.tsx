import { redirect } from "next/navigation";

import { getCurrentSession } from "@/modules/auth/server/current-session";

export default async function Home() {
  redirect((await getCurrentSession()) ? "/inbox" : "/sign-in");
}
