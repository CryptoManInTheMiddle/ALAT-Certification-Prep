import ClientOnly from "@/components/ClientOnly";
import ProgressView from "@/components/dashboard/ProgressView";

export default function ProgressPage() {
  return (
    <ClientOnly fallback={<div className="card animate-pulse text-muted">Loading progress…</div>}>
      <ProgressView />
    </ClientOnly>
  );
}
