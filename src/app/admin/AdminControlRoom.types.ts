import type { FormEvent } from "react";

import type { AdminOperationsScopeResponse } from "./AdminOperationsScope.types";

export type AdminControlRoomProps = {
  viewMode?: "all" | "accounts" | "jlpt";
  nickname: string;
  token: string;
  sessionAuthorized: boolean;
  checkingSession: boolean;
  googleConfigured: boolean;
  signedIn: boolean;
  emailAllowed: boolean;
  userName: string | null;
  userEmail: string | null;
  loading: boolean;
  jlptRefreshing: boolean;
  jlptEnriching: boolean;
  operationScope: AdminOperationsScopeResponse | null;
  onSetNickname: (value: string) => void;
  onSetToken: (value: string) => void;
  onAddAccount: (event: FormEvent<HTMLFormElement>) => void;
  onCompleteGoogleSignOut: () => void;
  onRefreshAll: () => void;
  onRefreshJlptList: () => void;
  onEnrichJlptKanji: () => void;
};
