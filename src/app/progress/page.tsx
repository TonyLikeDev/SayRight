import type { Metadata } from "next";
import { ProgressView } from "@/components/ProgressView";

export const metadata: Metadata = { title: "Progress · SayCoach" };

export default function ProgressPage() {
  return <ProgressView />;
}
