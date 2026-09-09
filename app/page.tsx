import SemesterCard from "@/components/SemesterCard";

// Day-level content changes once a day and the card corrects itself to the real
// client clock on hydration, so cached HTML is fine. Revalidating keeps crawlers
// and link unfurlers from ever seeing a build-time snapshot.
export const revalidate = 300;

export default function Home() {
  return <SemesterCard initialNowIso={new Date().toISOString()} />;
}
