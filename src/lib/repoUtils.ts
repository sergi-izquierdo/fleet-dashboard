/**
 * Extract "owner/repo" from a GitHub URL.
 * Works with URLs like:
 *   https://github.com/owner/repo/issues/123
 *   https://github.com/owner/repo/pull/456
 */
export function extractRepoFromUrl(url: string): string | null {
  const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
  return match ? match[1] : null;
}

/**
 * Get the short repo name from "owner/repo" format.
 */
export function shortRepoName(repo: string): string {
  return repo.split("/").pop() ?? repo;
}
