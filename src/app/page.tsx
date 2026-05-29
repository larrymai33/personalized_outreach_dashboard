import { getUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const u = await getUser();
  redirect(u ? "/dashboard" : "/sign-in");
}
