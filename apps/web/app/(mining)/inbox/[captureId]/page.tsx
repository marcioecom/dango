import { ReviewView } from "@/modules/mining/review/ui/views/review-view";

export default async function ReviewPage({ params }: { params: Promise<{ captureId: string }> }) {
  const { captureId } = await params;
  return <ReviewView captureId={captureId} />;
}
