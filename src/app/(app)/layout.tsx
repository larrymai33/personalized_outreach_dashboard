import { requireUser } from "@/lib/auth/session";
import Nav from "@/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <Nav />
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:ml-28 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
