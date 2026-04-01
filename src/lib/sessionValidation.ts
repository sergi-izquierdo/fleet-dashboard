const SESSION_NAME_REGEX = /^agent-[a-z]+-\d+$/;

export function isValidSessionName(name: string): boolean {
  return SESSION_NAME_REGEX.test(name);
}
