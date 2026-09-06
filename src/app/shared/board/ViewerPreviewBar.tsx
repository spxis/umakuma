import Link from "next/link";

import { type ViewerPreview } from "@/lib/accountListing";

import { VIEWER_PREVIEW_COPY as copy } from "./viewerPreviewCopy";

/**
 * The strip that says an admin is not seeing what they normally see.
 *
 * An admin's boards contain rows nobody else can see, and until now there was
 * no way to check the difference - which is the only way to answer "is this
 * member actually hidden". The preview answers it, and this makes it obvious
 * it is on: a page that quietly shows fewer rows than usual reads as a bug.
 *
 * Shown to admins only, because for everybody else it is not a control, it is
 * a lie about what they could do.
 */
export default function ViewerPreviewBar({
  isAdmin,
  previewAs,
  path,
}: {
  isAdmin: boolean;
  previewAs: ViewerPreview | null;
  /** The page it is on, so each link comes back to the same board. */
  path: string;
}) {
  if (!isAdmin) return null;

  const options: { key: ViewerPreview | null; label: string }[] = [
    { key: null, label: copy.asAdmin },
    { key: "member", label: copy.asMember },
    { key: "public", label: copy.asPublic },
  ];

  return (
    <div
      className={`mb-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${
        previewAs ? "border-amber-300 bg-amber-50" : "border-line bg-surface-muted/40"
      }`}
    >
      <span className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
        {previewAs ? copy.previewing() : copy.label}
      </span>
      {options.map((option) => (
        <Link
          key={option.key ?? "admin"}
          href={option.key ? `${path}?as=${option.key}` : path}
          aria-current={option.key === previewAs ? "true" : undefined}
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition ${
            option.key === previewAs
              ? "border-accent bg-accent text-white"
              : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
