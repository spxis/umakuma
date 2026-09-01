import { redirect } from "next/navigation";

import { DEFAULT_GRADE } from "./GradeExplorer.constants";
import { gradeHref, parseGradeParam, parsePageParam } from "./gradeExplorerView";

type PageProps = {
  params: Promise<{ nickname: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The old address, kept working.
 *
 * The grade moved into the path - `/grades/3` rather than `/grades?grade=3` -
 * because it says which collection is being looked at, which is what a link
 * means to whoever receives it. Links already sent, and any the search results
 * built before the change, still arrive here, so this sends them on rather
 * than letting them land on the wrong grade.
 *
 * The search text and the page number travel with the redirect, since they
 * describe how the collection is being read and stay in the query.
 */
export default async function UserGradesRedirect({ params, searchParams }: PageProps) {
  const { nickname } = await params;
  const query = await searchParams;

  const grade = parseGradeParam(firstValue(query.grade) ?? String(DEFAULT_GRADE));
  const page = parsePageParam(firstValue(query.page));
  const search = (firstValue(query.q) ?? "").trim();

  redirect(gradeHref(decodeURIComponent(nickname), grade, page, search));
}
