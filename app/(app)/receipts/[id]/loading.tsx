import { ViewTransition } from "react";
import { DetailSkeleton } from "@/components/skeletons/DetailSkeleton";

export default function ReceiptDetailLoading() {
  return (
    <ViewTransition exit="slide-down" default="none">
      <DetailSkeleton />
    </ViewTransition>
  );
}
