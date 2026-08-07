import { SessionView } from "@/modules/mining/ui/views/session-view";

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <SessionView sessionId={sessionId} />;
}
