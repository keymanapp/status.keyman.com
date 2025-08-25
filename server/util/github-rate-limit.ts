import { consoleLog } from "./console-log.js";

export interface KSGitHubRateLimit {
  limit: number,
  cost: number,
  remaining: number,
  resetAt: string,
};

export function logGitHubRateLimit(rateLimit: KSGitHubRateLimit, module: string) {
  consoleLog('rate-limit', module, `cost=${rateLimit?.cost} remaining=${rateLimit?.remaining}`);
}
