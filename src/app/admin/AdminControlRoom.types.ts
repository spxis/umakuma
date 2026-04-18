import type { FormEvent } from "react";

import type { Status } from "./AdminPage.types";

export type AdminControlRoomProps = {
  nickname: string;
  token: string;
  sessionAuthorized: boolean;
  checkingSession: boolean;
  googleConfigured: boolean;
  signedIn: boolean;
  emailAllowed: boolean;
  userName: string | null;
  userEmail: string | null;
  status: Status;
  loading: boolean;
  jlptRefreshing: boolean;
  jlptEnriching: boolean;
  onSetNickname: (value: string) => void;
  onSetToken: (value: string) => void;
  onAddAccount: (event: FormEvent<HTMLFormElement>) => void;
  onCompleteGoogleSignOut: () => void;
  onRefreshAll: () => void;
  onRefreshJlptList: () => void;
  onEnrichJlptKanji: () => void;
};
