import ClientOnly from "@/components/ClientOnly";
import ExamRunner from "@/components/study/ExamRunner";

export default function SimulatePage() {
  return (
    <ClientOnly fallback={<div className="card animate-pulse text-muted">Loading simulator…</div>}>
      <ExamRunner />
    </ClientOnly>
  );
}
