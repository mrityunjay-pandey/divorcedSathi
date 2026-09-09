"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { api, clearTokens, getCurrentUserRole, isAuthenticated } from "@/lib/api-client";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/search", label: "Search" },
  { href: "/matches", label: "Matches" },
  { href: "/interests", label: "Interests" },
  { href: "/notifications", label: "Notifications" },
];

const SETTINGS_LINKS = [
  { href: "/create-profile", label: "Edit Profile" },
  { href: "/verification", label: "Verification" },
  { href: "/subscription", label: "Subscription" },
  { href: "/settings/privacy", label: "Privacy" },
  { href: "/settings/blocked", label: "Blocked Users" },
  { href: "/safety", label: "Safety Center" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setIsAdmin(getCurrentUserRole() === "ADMIN");
  }, [pathname]);

  async function handleLogout() {
    const refreshToken = typeof window !== "undefined" ? window.localStorage.getItem("divorcedsathi_refresh_token") : null;
    try {
      if (refreshToken) await api.post("/auth/logout", { refreshToken });
    } catch {
      // Logging out client-side regardless of whether the server call succeeds —
      // an expired/invalid refresh token shouldn't strand the user unable to log out.
    } finally {
      clearTokens();
      router.push("/login");
    }
  }

  // Auth pages and the public landing page have no nav — nothing to navigate to yet.
  if (!authed || pathname === "/login" || pathname === "/register" || pathname === "/verify-otp") {
    return null;
  }

  return (
    <nav className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/discover" className="font-serif text-lg text-primary-700">
          DivorcedSathi
        </Link>
        <div className="hidden items-center gap-1 sm:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                pathname === link.href ? "bg-primary-50 text-primary-700" : "text-neutral-600 hover:bg-neutral-50",
              )}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                pathname === "/admin" ? "bg-primary-50 text-primary-700" : "text-neutral-600 hover:bg-neutral-50",
              )}
            >
              Admin
            </Link>
          )}
        </div>
        <div className="relative flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen((v) => !v)}>
            Settings
          </Button>
          {settingsOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border border-neutral-200 bg-white py-1 shadow-md">
              {SETTINGS_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSettingsOpen(false)}
                  className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="block w-full px-3 py-2 text-left text-sm text-danger-600 hover:bg-neutral-50"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
