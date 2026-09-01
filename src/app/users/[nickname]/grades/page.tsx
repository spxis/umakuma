import { redirect } from "next/navigation";

import { DEFAULT_GRADE } from "./GradeExplorer.constants";
import { gradeHref } from "./gradeExplorerView";

type PageProps = {
  params: Promise<{ nickname: string }>;
};

/**
 * The collection root, which opens on the first grade.
 *
 * The navigation links here rather than to a particular year, so this is the
 * way in rather than a compatibility shim: there is exactly one address for a
 * grade, `/grades/3`, and nothing reads a grade out of the query. The site has
 * no users yet, so an old link is a link nobody sent.
 */
export default async function UserGradesPage({ params }: PageProps) {
  const { nickname } = await params;
  redirect(gradeHref(decodeURIComponent(nickname), DEFAULT_GRADE));
}
