import { Platform } from 'react-native';
import { localDayKey } from './dailyClock';
import { StepEntry } from './types';

export type StepResult = { steps: number; available: boolean; permissionGranted: boolean; sampledAt?: string; hasData?: boolean; message?: string };

export async function readTodaySteps(requestAccess = false): Promise<StepResult> {
  if (Platform.OS !== 'android') {
    return { steps: 0, available: false, permissionGranted: false, message: 'Android Health Connect is required.' };
  }

  try {
    // Native module is unavailable in Expo Go; it is included in development/release builds.
    const health = await import('react-native-health-connect');
    const ready = await health.initialize();
    if (!ready) return { steps: 0, available: false, permissionGranted: false, message: 'Health Connect is unavailable.' };

    if (requestAccess) {
      await health.requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
    }

    const granted = await health.getGrantedPermissions();
    const hasSteps = granted.some((p) => p.accessType === 'read' && p.recordType === 'Steps');
    if (!hasSteps) return { steps: 0, available: true, permissionGranted: false, message: 'Allow step access in Health Connect.' };

    const start = new Date();
    const sampledAt = start.toISOString();
    start.setHours(0, 0, 0, 0);
    const records = await health.aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: sampledAt },
    });
    const steps = records.COUNT_TOTAL ?? 0;
    return { steps: Math.round(steps), sampledAt, hasData: typeof records.COUNT_TOTAL === 'number', available: true, permissionGranted: true };
  } catch (error) {
    return {
      steps: 0,
      available: false,
      permissionGranted: false,
      message: error instanceof Error ? error.message : 'Could not connect to Health Connect.',
    };
  }
}

// Query complete local calendar days, not rolling 24-hour windows. Permission
// and data availability may limit history; never invent zero for missing records.
export async function readRecentStepHistory(): Promise<StepEntry[]> {
  if (Platform.OS !== 'android') return [];
  const health = await import('react-native-health-connect');
  const rows: StepEntry[] = [];
  const now = new Date();
  for (let offset = 1; offset <= 28; offset++) {
    const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - offset);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    try {
      const result = await health.aggregateRecord({ recordType: 'Steps', timeRangeFilter: {
        operator: 'between', startTime: start.toISOString(), endTime: end.toISOString(),
      } });
      if (typeof result.COUNT_TOTAL === 'number' && Number.isFinite(result.COUNT_TOTAL) && result.COUNT_TOTAL >= 0) {
        rows.push({ day: localDayKey(start), steps: Math.round(result.COUNT_TOTAL), syncedAt: now.toISOString() });
      }
    } catch { /* Keep existing saved data when a day cannot be read. */ }
  }
  return rows;
}
