const USER_ID_KEY = 'userId';
const HAS_LOGGED_IN_KEY = 'hasLoggedInBefore';

function migrateFromSessionStorage(): string | null {
  if (typeof window === 'undefined') return null;

  const fromSession = sessionStorage.getItem(USER_ID_KEY);
  if (!fromSession) return null;

  localStorage.setItem(USER_ID_KEY, fromSession);
  sessionStorage.removeItem(USER_ID_KEY);
  return fromSession;
}

export function getStoredUserId(): string | null {
  if (typeof window === 'undefined') return null;

  const fromLocal = localStorage.getItem(USER_ID_KEY);
  if (fromLocal) return fromLocal;

  return migrateFromSessionStorage();
}

export function setStoredUserId(userId: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(HAS_LOGGED_IN_KEY, '1');
  sessionStorage.removeItem(USER_ID_KEY);
}

export function hasLoggedInOnThisDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(HAS_LOGGED_IN_KEY) === '1';
}

export function clearStoredUserId(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(USER_ID_KEY);
  sessionStorage.removeItem(USER_ID_KEY);
}
