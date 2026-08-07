import { LoginView } from "@/modules/auth/ui/views/login-view";
import { requireUnauth } from "@/modules/auth/server/auth-utils";

export default async function LoginPage() {
  await requireUnauth();
  return <LoginView />;
}
