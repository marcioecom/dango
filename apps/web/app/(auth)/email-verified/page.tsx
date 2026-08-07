import { EmailVerificationView } from "@/modules/auth/ui/views/email-verification-view";

type EmailVerifiedPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function EmailVerifiedPage({ searchParams }: EmailVerifiedPageProps) {
  const { error } = await searchParams;

  return <EmailVerificationView error={error} />;
}
