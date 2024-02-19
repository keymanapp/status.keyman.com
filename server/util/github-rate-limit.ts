export function logGitHubRateLimit(rateLimit, module) {
  console.log(`[RATE LIMIT] ${module}: cost=${rateLimit?.cost} remaining=${rateLimit?.remaining}`);
}
