const USER_ID_KEY = 'userId';

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
  sessionStorage.removeItem(USER_ID_KEY);
}

export function clearStoredUserId(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(USER_ID_KEY);
  sessionStorage.removeItem(USER_ID_KEY);
}
