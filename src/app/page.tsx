import ClientOnly from "@/components/ClientOnly";
import Dashboard from "@/components/dashboard/Dashboard";

export default function HomePage() {
  return (
    <ClientOnly fallback={<div className="card animate-pulse text-muted">Loading your dashboard…</div>}>
      <Dashboard />
    </ClientOnly>
  );
}
