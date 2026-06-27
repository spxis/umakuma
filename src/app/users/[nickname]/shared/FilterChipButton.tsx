import type { ComponentProps, ReactNode } from "react";

import FilterChipLabel from "./FilterChipLabel";

type Props = Omit<ComponentProps<"button">, "children"> & {
  label: ReactNode;
  count?: ReactNode;
  toneClassName: string;
};

const FILTER_CHIP_BUTTON_BASE_CLASS = "rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap";

export default function FilterChipButton({
  label,
  count,
  toneClassName,
  className,
  ...buttonProps
}: Props) {
  return (
    <button
      {...buttonProps}
      className={`${FILTER_CHIP_BUTTON_BASE_CLASS} ${toneClassName}${className ? ` ${className}` : ""}`}
    >
      {count === undefined ? label : <FilterChipLabel label={label} count={count} />}
    </button>
  );
}
