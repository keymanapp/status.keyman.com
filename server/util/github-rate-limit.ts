
export interface KSGitHubRateLimit {
  limit: number,
  cost: number,
  remaining: number,
  resetAt: string,
};

export function logGitHubRateLimit(rateLimit: KSGitHubRateLimit, module: string) {
  console.log(`[RATE LIMIT] ${module}: cost=${rateLimit?.cost} remaining=${rateLimit?.remaining}`);
}
