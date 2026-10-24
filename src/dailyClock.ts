export function localDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function localDayToken(date = new Date()): string {
  return `${localDayKey(date)}|${date.getTimezoneOffset()}`;
}

// Midnight timers may be suspended by Android. Always recheck on foreground,
// and at most once a minute while active to handle clock/time-zone changes.
export function startDailyClock(onTick: (date: Date) => void, subscribeForeground: (refresh: () => void) => () => void): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const refresh = () => {
    if (stopped) return;
    clearTimeout(timer);
    const now = new Date();
    onTick(now);
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 50);
    timer = setTimeout(refresh, Math.min(60000, Math.max(50, midnight.getTime() - now.getTime())));
  };
  const unsubscribe = subscribeForeground(refresh);
  refresh();
  return () => { stopped = true; clearTimeout(timer); unsubscribe(); };
}
