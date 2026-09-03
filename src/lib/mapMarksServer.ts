import "server-only";

import { isMapMarkStatus, markIsEmpty, type MapMarkIndex, type MapMarkStatus } from "./mapMarks";
import { prisma } from "./prisma";

/**
 * Reading and writing what a member has said about a country's regions.
 *
 * One query per map rather than per region: 47 prefectures is one small row
 * set, and the map paints all of them at once, so fetching per region would
 * be 47 requests to draw one picture.
 */

export async function loadMapMarks(accountId: string | null, country: string): Promise<MapMarkIndex> {
  if (!accountId) return {};
  const rows = await prisma.mapRegionMark.findMany({
    where: { accountId, country },
    select: { region: true, status: true, visited: true },
  });

  const index: MapMarkIndex = {};
  for (const row of rows) {
    index[row.region] = {
      status: row.status && isMapMarkStatus(row.status) ? row.status : null,
      visited: row.visited,
    };
  }
  return index;
}

/**
 * Setting one region's mark.
 *
 * Nothing said deletes the row rather than storing "no opinion": a member who
 * marks Iwate known and then clears it should leave no trace, or every count
 * has to filter the empties out first.
 */
export async function saveMapMark(input: {
  accountId: string;
  country: string;
  region: string;
  status: MapMarkStatus | null;
  visited: boolean;
}): Promise<void> {
  const { accountId, country, region, status, visited } = input;
  const where = { accountId_country_region: { accountId, country, region } };

  if (markIsEmpty({ status, visited })) {
    await prisma.mapRegionMark.deleteMany({ where: { accountId, country, region } });
    return;
  }

  await prisma.mapRegionMark.upsert({
    where,
    create: { accountId, country, region, status, visited },
    update: { status, visited },
  });
}
