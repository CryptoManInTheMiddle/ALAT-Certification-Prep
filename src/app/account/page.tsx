import ClientOnly from "@/components/ClientOnly";
import AccountScreen from "@/components/account/AccountScreen";

export default function AccountPage() {
  return (
    <ClientOnly fallback={<div className="card animate-pulse text-muted">Loading…</div>}>
      <AccountScreen />
    </ClientOnly>
  );
}
