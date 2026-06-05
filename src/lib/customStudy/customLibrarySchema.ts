import { z } from "zod";

const customLibraryItemSchema = z.object({
  id: z.string().trim().min(1).max(120),
  type: z.enum(["kanji", "vocabulary", "phrase"]),
  level: z.number().int().min(1).max(60),
  characters: z.string().trim().min(1).max(120),
  meanings: z.array(z.string().trim().min(1).max(180)).min(1).max(20),
  readings: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  primaryReading: z.string().trim().min(1).max(120).optional(),
  meaningMnemonic: z.string().trim().min(1).max(2000).optional(),
  readingMnemonic: z.string().trim().min(1).max(2000).optional(),
  synonyms: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
  notes: z.string().trim().min(1).max(2000).optional(),
});

export const customLibraryPayloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    library: z.object({
      id: z.string().trim().min(1).max(120),
      name: z.string().trim().min(1).max(120),
      description: z.string().trim().min(1).max(500).optional(),
    }),
    items: z.array(customLibraryItemSchema).min(1).max(10_000),
  })
  .superRefine((payload, ctx) => {
    const duplicateIds = new Set<string>();
    const seenIds = new Set<string>();

    for (const item of payload.items) {
      if (seenIds.has(item.id)) {
        duplicateIds.add(item.id);
      }
      seenIds.add(item.id);
    }

    if (duplicateIds.size > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate item IDs: ${Array.from(duplicateIds).join(", ")}`,
      });
    }
  });

export type ParsedCustomLibraryPayload = z.infer<typeof customLibraryPayloadSchema>;
