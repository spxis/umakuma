import type { Mode } from "./NewsReader.types";

export type NewsReaderFormProps = {
  mode: Mode;
  onChangeMode: (mode: Mode) => void;
  url: string;
  onChangeUrl: (value: string) => void;
  loading: boolean;
  discoverLoading: boolean;
  devSampleUrls: string[];
  onSubmit: (explicitSubmit: boolean) => void;
};
