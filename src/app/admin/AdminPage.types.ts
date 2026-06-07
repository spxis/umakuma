export type Status = {
  type: "idle" | "ok" | "error";
  message: string;
};

export type AdminSessionStatus = {
  authorized?: boolean;
  googleConfigured?: boolean;
  signedIn?: boolean;
  emailAllowed?: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
    wkUsername?: string | null;
  } | null;
};
