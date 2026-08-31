import "server-only";

import { prisma } from "./prisma";
import {
  type SignupSettingKey,
  type SignupSettings,
  resolveSignupSettings,
} from "./signupSettings";

/**
 * The current signup settings, or their defaults when nothing is stored.
 *
 * Reads every row rather than the four it knows about, so a setting removed
 * from the code leaves an inert row instead of an error, and resolution stays
 * in the pure module where it can be tested.
 */
export async function loadSignupSettings(): Promise<SignupSettings> {
  const rows = await prisma.siteSetting.findMany({ select: { key: true, value: true } });
  return resolveSignupSettings(rows);
}

/** Write one setting. The caller validates the value first. */
export async function saveSignupSetting(key: SignupSettingKey, value: string): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
