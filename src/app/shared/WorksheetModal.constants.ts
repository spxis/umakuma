import { STUDY_LIST_COPY } from "./studyListCopy";

/** Everything the worksheet frame says, in one module for the locale layer. */
export const WORKSHEET_MODAL_COPY = {
  /* Not a fourth spelling of the word. The control that opens the sheet is
     called Worksheet on every surface, and the label already lives in the
     study-list copy, so it is taken from there rather than typed again. */
  open: STUDY_LIST_COPY.worksheet,
  openHint: STUDY_LIST_COPY.worksheetHint,
  title: (name: string) => `Worksheet · ${name}`,
  loading: "Setting out the sheet…",
  print: "Print",
  printHint: "Open your printer, with this sheet and nothing around it",
  full: "Open the full sheet",
  fullHint: "The sheet on its own page, with every option",
  close: "Done",
} as const;
