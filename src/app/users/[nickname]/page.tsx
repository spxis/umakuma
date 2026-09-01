import { redirect } from "next/navigation";

/**
 * A member's page root, which opens on Study.
 *
 * This file used to *be* all six member pages. `next.config.ts` rewrote
 * `/users/:nickname/study`, `/library-explorer`, `/jlpt-explorer`, `/read`,
 * `/stats` and `/news` onto it with a `?dashboard=` query, so six addresses
 * were one 474-line component - which is how they drifted into six different
 * layouts without anybody editing six files, and why every one of them loaded
 * every level snapshot on the account whether it showed them or not.
 *
 * Each of the six is a route of its own now and loads what it shows. All this
 * has left to do is answer the bare `/users/<who>` address, and it points at
 * Study because that is what the navigation means by a member's page.
 */
export default async function UserPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  redirect(`/users/${encodeURIComponent(decodeURIComponent(nickname))}/study`);
}
