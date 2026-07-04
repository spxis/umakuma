import type { FormEvent } from "react";

import type { AdminOperationsScopeResponse } from "./AdminOperationsScope.types";

export type AdminUsersPanelProps = {
  sessionAuthorized: boolean;
  checkingSession: boolean;
  viewerEmail: string | null;
  loading: boolean;
  nickname: string;
  token: string;
  operationScope: AdminOperationsScopeResponse | null;
  onSetNickname: (value: string) => void;
  onSetToken: (value: string) => void;
  onAddAccount: (event: FormEvent<HTMLFormElement>) => void;
  onRefreshAll: () => Promise<void>;
};
