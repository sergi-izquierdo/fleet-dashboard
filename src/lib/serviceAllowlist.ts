export const ALLOWED_SERVICES = [
  "orchestrator",
  "dashboard",
  "telegram",
  "obs-server",
  "obs-client",
  "auto-accept",
] as const;

export type AllowedService = (typeof ALLOWED_SERVICES)[number];

export function isAllowedService(service: string): service is AllowedService {
  return (ALLOWED_SERVICES as readonly string[]).includes(service);
}
