import ClientOnly from "@/components/ClientOnly";
import NotesView from "@/components/NotesView";

export default function NotesPage() {
  return (
    <ClientOnly fallback={<div className="card animate-pulse text-muted">Loading notes…</div>}>
      <NotesView />
    </ClientOnly>
  );
}
