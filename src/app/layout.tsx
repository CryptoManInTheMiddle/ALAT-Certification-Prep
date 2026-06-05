import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomTabBar from "@/components/nav/BottomTabBar";
import ServiceWorkerRegistrar from "@/components/pwa/ServiceWorkerRegistrar";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import SyncManager from "@/components/account/SyncManager";

export const metadata: Metadata = {
  title: "LabReady — ALAT Prep",
  description: "Adaptive, learning-science-driven prep for the AALAS ALAT certification exam.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "LabReady" },
};

export const viewport: Viewport = {
  themeColor: "#0a0f14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <main className="mx-auto max-w-md px-4 pt-5 pb-28">{children}</main>
        <BottomTabBar />
        <InstallPrompt />
        <ServiceWorkerRegistrar />
        <SyncManager />
      </body>
    </html>
  );
}
