export const PENDING_JOIN_CODE_KEY = 'pendingJoinCode';

export function getPendingJoinCode(): string {
  if (typeof window === 'undefined') return '';
  return (sessionStorage.getItem(PENDING_JOIN_CODE_KEY) || '').toUpperCase().trim();
}

export function setPendingJoinCode(code: string): void {
  if (typeof window === 'undefined') return;
  const normalized = code.toUpperCase().trim();
  if (normalized) {
    sessionStorage.setItem(PENDING_JOIN_CODE_KEY, normalized);
  } else {
    sessionStorage.removeItem(PENDING_JOIN_CODE_KEY);
  }
}

export function clearPendingJoinCode(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PENDING_JOIN_CODE_KEY);
}
