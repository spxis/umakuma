import type { ReactNode } from "react";

type Props = {
  label: ReactNode;
  count: ReactNode;
};

export default function FilterChipLabel({ label, count }: Props) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span>{label}</span>
      <span className="text-[10px] font-medium tracking-normal text-current/60">({count})</span>
    </span>
  );
}
