import type { ReactNode } from "react";
import { noTranslateClass } from "@/app/shared/japaneseText";

type Props = {
  label: ReactNode;
  count: ReactNode;
};

export default function FilterChipLabel({ label, count }: Props) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span>{label}</span>
      {/* A count is data. Translating it can only respace the brackets. */}
      <span translate="no" className={noTranslateClass("text-[10px] font-medium tracking-normal text-current/60")}>
        ({count})
      </span>
    </span>
  );
}
