import { Prisma } from "@prisma/client";

const customStudyItemModel = Prisma.dmmf.datamodel.models.find((model) => model.name === "CustomStudyItem");

export const customItemSupportsWkLevel = Boolean(
  customStudyItemModel?.fields.some((field) => field.name === "wkLevel"),
);

export function resolveCustomItemLevel(item: { wkLevel?: number | null }): number {
  if (typeof item.wkLevel !== "number" || !Number.isFinite(item.wkLevel) || item.wkLevel <= 0) {
    return 1;
  }

  return Math.trunc(item.wkLevel);
}