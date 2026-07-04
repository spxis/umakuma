export type InviteSessionStatus = {
  signedIn?: boolean;
  account?: {
    id: string;
    nickname: string;
    wkUsername: string;
  };
  error?: string;
};

export type InviteCodeAccessPanelProps = {
  initialSession: InviteSessionStatus;
};
