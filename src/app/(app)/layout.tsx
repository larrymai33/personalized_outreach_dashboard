import { requireUser } from "@/lib/auth/session";
import Nav from "@/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
