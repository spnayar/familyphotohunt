export function touchUserActivity(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;

  const key = `userActivityTouch:${userId}`;
  const lastTouch = sessionStorage.getItem(key);
  const now = Date.now();
  if (lastTouch && now - Number(lastTouch) < 30 * 60 * 1000) {
    return;
  }

  sessionStorage.setItem(key, String(now));

  void fetch(`/api/users/${userId}/activity`, { method: 'POST' }).catch(() => {
    // Best-effort heartbeat; ignore failures.
  });
}
