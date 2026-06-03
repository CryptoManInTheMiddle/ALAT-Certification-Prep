import ClientOnly from "@/components/ClientOnly";
import LearnMode from "@/components/study/LearnMode";

export default function LearnPage() {
  return (
    <ClientOnly fallback={<div className="card animate-pulse text-muted">Loading…</div>}>
      <LearnMode />
    </ClientOnly>
  );
}
