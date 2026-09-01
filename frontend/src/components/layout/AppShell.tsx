import { NavLink, Outlet } from "react-router-dom";
import {
  Activity, BarChart3, Dumbbell, Package, Plus, Ruler, Settings, Utensils, CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const nav = [
  { to: "/", label: "Dashboard", Icon: BarChart3, end: true },
  { to: "/log", label: "Quick Log", Icon: Plus },
  { to: "/workouts", label: "Workouts", Icon: Dumbbell },
  { to: "/body", label: "Body", Icon: Ruler },
  { to: "/food", label: "Food & Mood", Icon: Utensils },
  { to: "/report", label: "Weekly", Icon: CalendarRange },
  { to: "/products", label: "Products", Icon: Package },
  { to: "/profile", label: "Profile", Icon: Settings },
];

export default function AppShell() {
  return (
    <div className="min-h-dvh md:pl-56">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight">Recomp Tracker</span>
          </div>
          <ThemeToggle />
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
          Tip: press <kbd className="rounded bg-background px-1 py-0.5">L</kbd> anywhere to quick-log.
        </div>
      </aside>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8">
        {/* Mobile header — respects notch/status bar */}
        <div className="safe-pt mb-4 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight">Recomp Tracker</span>
          </div>
          <ThemeToggle />
        </div>
        <Outlet />
      </main>

      {/* Bottom nav (mobile) — respects home indicator */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {nav.slice(0, 5).map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px]",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
