import { describe, expect, it } from "vitest";

import { srsStageLabel, srsStageLabelForStage } from "./srsStageLabel";

describe("srsStageLabel", () => {
  it("spaces the hyphen on both sides", () => {
    /* The bug this format exists to prevent came back as "APPR- SRS4". */
    expect(srsStageLabel("APPR", 4)).toBe("APPR - SRS 4");
    expect(srsStageLabel("MASTER", 7)).toBe("MASTER - SRS 7");
  });

  it("names the bucket a bare stage number falls in", () => {
    expect(srsStageLabelForStage(1)).toBe("APPR - SRS 1");
    expect(srsStageLabelForStage(4)).toBe("APPR - SRS 4");
    expect(srsStageLabelForStage(5)).toBe("GURU - SRS 5");
    expect(srsStageLabelForStage(7)).toBe("MASTER - SRS 7");
    expect(srsStageLabelForStage(8)).toBe("ENLIGHT - SRS 8");
    expect(srsStageLabelForStage(9)).toBe("BURNED - SRS 9");
  });

  it("gives stage 0 no anchor, because it is the rung nothing has left", () => {
    expect(srsStageLabelForStage(0)).toBeNull();
  });
});
