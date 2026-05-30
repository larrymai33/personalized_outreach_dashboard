"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/auth-client";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/offerings", label: "Offerings" },
  { href: "/prompts", label: "Prompts" },
  { href: "/prospects", label: "Prospects" },
  { href: "/generate", label: "Generate" },
  { href: "/conversations", label: "Conversations" },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <nav className="w-full border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          {/* Brand */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-bold tracking-tight text-zinc-900 transition-colors hover:text-zinc-700"
          >
            <Image src="/outreach-transparent.png" alt="" width={34} height={34} className="h-8 w-8 scale-125 object-contain" />
            <span>Outreach</span>
          </Link>
          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
