import { prisma } from "@/lib/prisma";

export async function getOwnedCustomLibrary(params: {
  accountId: string;
  libraryId: string;
}): Promise<{ id: string; name: string } | null> {
  return prisma.customStudyLibrary.findFirst({
    where: {
      id: params.libraryId,
      accountId: params.accountId,
    },
    select: {
      id: true,
      name: true,
    },
  });
}
