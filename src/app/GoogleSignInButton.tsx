"use client";

type Props = {
  callbackPath: string;
  className: string;
  prompt?: "select_account";
};

async function startGoogleSignIn(callbackPath: string, prompt?: "select_account") {
  try {
    const { signIn } = await import("next-auth/react");
    await signIn("google", { callbackUrl: callbackPath }, prompt ? { prompt } : undefined);
  } catch {
    const callbackUrl = encodeURIComponent(callbackPath);
    const promptQuery = prompt ? `&prompt=${encodeURIComponent(prompt)}` : "";
    window.location.assign(`/api/auth/signin/google?callbackUrl=${callbackUrl}${promptQuery}`);
  }
}

export default function GoogleSignInButton({ callbackPath, className, prompt }: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        void startGoogleSignIn(callbackPath, prompt);
      }}
      className={className}
    >
      Sign in with Google
    </button>
  );
}
