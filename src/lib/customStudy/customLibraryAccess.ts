import { prisma } from "@/lib/prisma";

import { ensureCustomLibraryWaniKaniBackfill } from "./customLibraryBackfill";

export async function getOwnedCustomLibrary(params: {
  accountId: string;
  libraryId: string;
}): Promise<{ id: string; name: string } | null> {
  const library = await prisma.customStudyLibrary.findFirst({
    where: {
      id: params.libraryId,
      accountId: params.accountId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!library) {
    return null;
  }

  await ensureCustomLibraryWaniKaniBackfill({
    accountId: params.accountId,
    libraryId: library.id,
  });

  return library;
}
