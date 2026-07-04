export type TrendPoint = {
  timeMs: number;
  label: string;
  correct: number;
  wrong: number;
};

export type SuccessRatePoint = {
  timeMs: number;
  label: string;
  rate: number;
};

export type ActivityPoint = {
  timeMs: number;
  label: string;
  reviews: number;
};
