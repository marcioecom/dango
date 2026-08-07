import { redirect } from "next/navigation";

import { getSession } from "@/modules/auth/server/auth-utils";

export default async function Home() {
  redirect((await getSession()) ? "/inbox" : "/sign-in");
}
