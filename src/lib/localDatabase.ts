/**
 * Whether a database URL points at the machine this is running on.
 *
 * The scripts that write rows ask this before touching anything, and refuse
 * a remote answer without `--allow-remote`: a production write should be a
 * deliberate act with a backup in front of it, not something a worktree's
 * environment decides. `host.docker.internal` is the container's own name for
 * the host, which the local stack uses from inside.
 *
 * Shared because two scripts had their own copy and a third was about to.
 */
export function isLocalDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(hostname);
  } catch {
    return false;
  }
}
