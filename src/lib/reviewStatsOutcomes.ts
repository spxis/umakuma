export type ReviewOutcomeInput = {
  result: "correct" | "wrong" | "skipped";
};

export function summarizeReviewOutcomes(rows: ReviewOutcomeInput[]) {
  return rows.reduce(
    (totals, row) => {
      if (row.result === "wrong") {
        totals.failure += 1;
      } else if (row.result === "correct") {
        totals.success += 1;
      }

      return totals;
    },
    { success: 0, failure: 0 },
  );
}

export function buildReviewOutcomeSeries<T extends ReviewOutcomeInput>(rows: T[]) {
  let success = 0;
  let failure = 0;

  return rows.flatMap((row) => {
    if (row.result === "skipped") {
      return [];
    }

    if (row.result === "correct") success += 1;
    else failure += 1;

    return [{ ...row, success, failure, total: success + failure }];
  });
}