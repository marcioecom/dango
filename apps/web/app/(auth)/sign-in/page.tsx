import { redirect } from "next/navigation";

import { LoginView } from "@/modules/auth/ui/views/login-view";
import { getCurrentSession } from "@/modules/auth/server/current-session";

export default async function LoginPage() {
  if (await getCurrentSession()) {
    redirect("/inbox");
  }

  return <LoginView />;
}
