export type InviteSessionStatus = {
  signedIn?: boolean;
  account?: {
    id: string;
    nickname: string;
    /** Absent when the account has no WaniKani link. */
    wkUsername: string | null;
  };
  error?: string;
};

export type InviteCodeAccessPanelProps = {
  initialSession: InviteSessionStatus;
};
