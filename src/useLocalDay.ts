import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localDayToken, startDailyClock } from './dailyClock';

export function useLocalDay(): Date {
  const [snapshot, setSnapshot] = useState(() => {
    const date = new Date();
    return { date, token: localDayToken(date) };
  });
  useEffect(() => startDailyClock(date => {
    const token = localDayToken(date);
    setSnapshot(current => current.token === token ? current : { date, token });
  }, refresh => {
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') refresh(); });
    return () => subscription.remove();
  }), []);
  return snapshot.date;
}
