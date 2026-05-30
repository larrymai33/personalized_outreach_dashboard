"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  Home,
  LogOut,
  MessagesSquare,
  Package,
  Send,
  Users,
} from "lucide-react";
import { signOut } from "@/lib/auth/auth-client";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/generate", label: "Generate", icon: Send },
  { href: "/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/prompts", label: "Prompts", icon: FileText },
  { href: "/offerings", label: "Offerings", icon: Package },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
            <Image
              src="/outreach-transparent.png"
              alt="Outreach"
              width={34}
              height={34}
              className="h-8 w-8 scale-125 object-contain"
              priority
            />
            Outreach
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navLinks.slice(0, 6).map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={`mobile-${link.label}-${link.href}`}
                href={link.href}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
                  isActive ? "bg-emerald-50 text-emerald-700" : "text-zinc-500"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-28 flex-col border-r border-zinc-200 bg-white/95 shadow-[10px_0_30px_rgba(24,24,27,0.04)] backdrop-blur lg:flex">
        <Link href="/dashboard" className="flex h-24 items-center justify-center">
          <Image
            src="/outreach-transparent.png"
            alt="Outreach"
            width={44}
            height={44}
            className="h-11 w-11 scale-125 object-contain"
            priority
          />
        </Link>

        <nav className="flex flex-1 flex-col items-stretch gap-2 px-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.label === "Analytics"
                ? false
                : link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(link.href);

            return (
              <Link
                key={`${link.label}-${link.href}`}
                href={link.href}
                className={`relative flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg text-xs font-medium transition-colors active:scale-[0.96] ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"
                }`}
              >
                {isActive && <span className="absolute left-0 h-full w-1 rounded-r-full bg-emerald-500" />}
                <Icon className="h-5 w-5" strokeWidth={1.9} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-2 pb-5">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-16 w-full flex-col items-center justify-center gap-2 rounded-lg text-xs font-medium text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 active:scale-[0.96]"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.9} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
