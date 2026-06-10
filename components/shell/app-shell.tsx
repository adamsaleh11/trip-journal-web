"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BookOpen,
  Compass,
  Dice5,
  LogOut,
  MapPinned,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useRightNow } from "@/components/right-now/right-now-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/trips", label: "Trips", icon: BookOpen },
  { href: "/map", label: "Map", icon: MapPinned },
  { href: "/dashboard", label: "Dashboard", icon: Activity },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { openRightNow } = useRightNow();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-background/88 px-4 py-5 backdrop-blur-xl lg:block">
        <Link
          href="/trips"
          className="mb-8 flex items-center gap-3 rounded-md px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-serif text-xl font-semibold">Trip Journal</span>
            <span className="block text-xs text-muted-foreground">Shared atlas</span>
          </span>
        </Link>

        <nav className="space-y-1" aria-label="Primary">
          <Button
            type="button"
            variant="ghost"
            className="mb-3 h-auto w-full justify-start px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/12 hover:text-primary"
            onClick={() => openRightNow()}
          >
            <Dice5 className="h-4 w-4" aria-hidden="true" />
            Right Now
          </Button>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active && "bg-primary/14 text-primary",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border bg-background/88 px-4 py-3 backdrop-blur-xl lg:ml-72">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/trips"
            className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <Compass className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-serif text-lg font-semibold">Trip Journal</span>
          </Link>

          <nav className="hidden gap-1 sm:flex lg:hidden" aria-label="Primary">
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-2 text-sm font-medium text-primary hover:bg-primary/12 hover:text-primary"
              onClick={() => openRightNow()}
            >
              <Dice5 className="h-4 w-4" aria-hidden="true" />
              Right Now
            </Button>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active && "bg-primary/14 text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open user menu">
                {user?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserCircle className="h-5 w-5" aria-hidden="true" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <span className="block truncate">{user?.displayName ?? "Traveler"}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="mt-3 grid grid-cols-4 gap-1 sm:hidden" aria-label="Primary">
          <Button
            type="button"
            variant="ghost"
            className="flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-primary hover:bg-primary/12 hover:text-primary"
            onClick={() => openRightNow()}
          >
            <Dice5 className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">Now</span>
          </Button>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active && "bg-primary/14 text-primary",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:ml-72 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
