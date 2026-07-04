export type AuthTab = "invite" | "google";

export type AuthAccessScreenProps = {
  activeTab: AuthTab;
  accessDenied?: boolean;
  allowGoogleRouteRedirects?: boolean;
  googleCallbackPath?: string;
};
