import AuthAccessScreen from "../AuthAccessScreen";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{
    access?: string | string[];
    flow?: string | string[];
  }>;
};

function isAccessDenied(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "denied";
}

export default async function JoinPage({ searchParams }: PageProps) {
  const query = await searchParams;

  if (query.flow) {
    const next = isAccessDenied(query.access) ? "/join?access=denied" : "/join";
    redirect(next);
  }

  return <AuthAccessScreen activeTab="invite" accessDenied={isAccessDenied(query.access)} />;
}
