"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Bottom tab bar — the five core study surfaces (CLAUDE.md §9).
const TABS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/learn", label: "Learn", icon: LearnIcon },
  { href: "/practice", label: "Practice", icon: PracticeIcon },
  { href: "/simulate", label: "Simulate", icon: SimulateIcon },
  { href: "/review", label: "Review", icon: ReviewIcon },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-line bg-ink/95 backdrop-blur pb-safe">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[11px] ${
                active ? "text-clinical-400" : "text-muted"
              }`}
            >
              <Icon className="h-6 w-6" active={active} />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

type IconProps = { className?: string; active?: boolean };
const stroke = (active?: boolean) => (active ? 2.2 : 1.7);

function HomeIcon({ className, active }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke(active)} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" />
    </svg>
  );
}
function LearnIcon({ className, active }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke(active)} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h11a3 3 0 013 3v11" /><path d="M4 5v13a2 2 0 002 2h12" />
    </svg>
  );
}
function PracticeIcon({ className, active }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke(active)} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}
function SimulateIcon({ className, active }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke(active)} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function ReviewIcon({ className, active }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke(active)} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 11-3-6.7" /><path d="M21 4v4h-4" />
    </svg>
  );
}
