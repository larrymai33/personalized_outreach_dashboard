import { listOfferings } from "@/lib/actions/offerings";
import OfferingsClient from "./offerings-client";

export default async function OfferingsPage() {
  const offerings = await listOfferings();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Offerings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          An offering describes your product or service — it powers personalised outreach by giving the AI context on what you sell and who you help.
        </p>
      </div>
      <OfferingsClient initial={offerings} />
    </div>
  );
}
