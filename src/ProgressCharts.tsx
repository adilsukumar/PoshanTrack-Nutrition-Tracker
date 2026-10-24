import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppState } from './types';
import { dailyProgress, DailyProgress } from './progress';
import { colours } from './theme';

const dateLabel = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const valueLabel = (value: number | null, metric: string) => value === null ? '—' : metric === 'weightKg' ? value.toFixed(1) : Math.round(value).toLocaleString('en-IN');

function DailyChart({ rows, metric, title, unit, colour, target }: { rows: DailyProgress[]; metric: 'calories' | 'steps' | 'weightKg'; title: string; unit: string; colour: string; target?: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(1, target ?? 0, ...rows.map(row => row[metric] ?? 0));
  const current = rows.find(row => row.day === selected) ?? rows[rows.length - 1];
  const known = rows.filter(row => row[metric] !== null);
  const average = known.length ? known.reduce((sum, row) => sum + (row[metric] ?? 0), 0) / known.length : null;
  return <View style={s.card}>
    <Text style={s.heading}>{title}</Text>
    <Text style={s.caption}>{dateLabel(current.day)}{current.today ? ' · today so far' : ''}: {valueLabel(current[metric], metric)} {unit}</Text>
    <Text style={s.caption}>Average of {known.length} logged days: {valueLabel(average, metric)} {unit}{target ? ` · target ${target.toLocaleString('en-IN')}` : ''}</Text>
    <Text style={s.axis}>Scale: 0–{valueLabel(max, metric)} {unit} · tap a bar for details</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={s.chart}>
      {rows.map(row => <Pressable key={row.day} onPress={() => setSelected(row.day)} accessibilityRole="button"
        accessibilityLabel={`${dateLabel(row.day)}, ${title}, ${row[metric] === null ? 'not logged' : `${valueLabel(row[metric], metric)} ${unit}`}`} style={s.column}>
        <Text style={s.smallValue}>{valueLabel(row[metric], metric)}</Text>
        <View style={s.track}>
          {!!target && <View style={[s.target, { bottom: 120 * target / max }]} />}
          {row[metric] !== null ? <View style={{ width: 27, height: Math.max(2, 120 * row[metric]! / max), backgroundColor: colour, borderRadius: 5, opacity: row.today ? 0.6 : 1 }} /> : <Text style={s.missing}>—</Text>}
        </View>
        <Text style={[s.day, selected === row.day && { color: colours.green, fontWeight: '800' }]}>{dateLabel(row.day)}</Text>
      </Pressable>)}
    </ScrollView>
    {known.length === 0 && <Text style={s.caption}>No data yet. Your chart fills as you log or sync.</Text>}
  </View>;
}

export default function ProgressCharts({ state, now, onAddWeight }: { state: AppState; now: Date; onAddWeight: () => void }) {
  const [days, setDays] = useState(7);
  const [offset, setOffset] = useState(0);
  const rows = useMemo(() => {
    const end = new Date(now); end.setDate(end.getDate() - offset);
    return dailyProgress(state, days, end).map(row => ({ ...row, today: offset === 0 && row.today }));
  }, [state, days, now, offset]);
  const weights = [...state.weights].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const change = weights.length > 1 ? weights[weights.length - 1].weightKg - weights[0].weightKg : null;
  return <ScrollView contentContainerStyle={s.screen}>
    <Text style={s.kicker}>PROGRESS</Text><Text style={s.title}>Your days, at a glance.</Text>
    <View style={s.card}><Text style={s.heading}>Current weight · {state.profile.weightKg || '—'} kg</Text>
      <Text style={s.caption}>{change === null ? 'Log a weigh-in to build your trend.' : `${change >= 0 ? '+' : ''}${change.toFixed(1)} kg since your first log`}{state.profile.goalWeightKg ? ` · goal ${state.profile.goalWeightKg} kg` : ''}</Text>
      <Pressable onPress={onAddWeight} accessibilityRole="button" style={s.button}><Text style={s.buttonText}>Log today’s weight</Text></Pressable>
    </View>
    <View style={s.range}>{[7, 30].map(count => <Pressable key={count} accessibilityRole="button" accessibilityState={{ selected: days === count }} onPress={() => { setDays(count); setOffset(0); }} style={[s.rangeButton, days === count && { backgroundColor: colours.green }]}><Text style={{ color: days === count ? 'white' : colours.ink, fontWeight: '700' }}>{count} days</Text></Pressable>)}</View>
    <View style={s.range}>
      <Pressable accessibilityRole="button" onPress={() => setOffset(value => value + days)} style={s.rangeButton}><Text>← Earlier</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={offset === 0} onPress={() => setOffset(value => Math.max(0, value - days))} style={[s.rangeButton, { opacity: offset ? 1 : 0.4 }]}><Text>Newer →</Text></Pressable>
      {!!offset && <Pressable accessibilityRole="button" onPress={() => setOffset(0)} style={s.rangeButton}><Text>Latest</Text></Pressable>}
    </View>
    <Text style={s.caption}>{dateLabel(rows[0].day)} – {dateLabel(rows[rows.length - 1].day)}, {rows[rows.length - 1].day.slice(0, 4)}</Text>
    <Text style={s.caption}>Today is partial. Missing logs show —, not zero. Calories mean food logged, not calories burned. Swipe charts for all dates.</Text>
    <DailyChart rows={rows} metric="calories" title="Daily food calories" unit="kcal" colour={colours.saffron} target={state.profile.calorieTarget} />
    <DailyChart rows={rows} metric="steps" title="Daily steps" unit="steps" colour={colours.green} target={state.profile.stepTarget} />
    <DailyChart rows={rows} metric="weightKg" title="Daily weigh-ins" unit="kg" colour={colours.blue} />
    <Text style={s.caption}>Steps are saved per calendar day. Health Connect can fill available past 28 days when you sync; it needs a phone fitness app recording steps. Older saved days remain in your diary. A previous partial sync may not be a full-day total. Weight is shown only on days you actually weigh in.</Text>
    <View style={s.card}><Text style={s.heading}>Daily log</Text>
      <View style={s.row}><Text style={s.date}>Date</Text><Text style={s.cell}>kcal</Text><Text style={s.cell}>Steps</Text><Text style={s.cell}>kg</Text></View>
      {[...rows].reverse().map(row => <View key={row.day} style={s.row}>
        <Text style={s.date}>{dateLabel(row.day)}{row.today ? ' *' : ''}</Text>
        <Text style={s.cell}>{valueLabel(row.calories, 'calories')}</Text><Text style={s.cell}>{valueLabel(row.steps, 'steps')}</Text><Text style={s.cell}>{valueLabel(row.weightKg, 'weightKg')}</Text>
      </View>)}
    </View>
    <Text style={s.caption}>Weight naturally fluctuates. Similar-condition weekly weigh-ins help reveal a trend; daily weighing is optional.</Text>
  </ScrollView>;
}

const s = StyleSheet.create({
  screen: { padding: 20, gap: 14, paddingBottom: 30 }, kicker: { color: colours.green, fontWeight: '800', letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: '800', color: colours.ink }, card: { backgroundColor: colours.surface, padding: 16, borderRadius: 20, gap: 10, borderWidth: 1, borderColor: colours.border },
  heading: { fontSize: 18, fontWeight: '800', color: colours.ink }, caption: { fontSize: 13, lineHeight: 20, color: colours.muted },
  button: { backgroundColor: colours.green, padding: 14, borderRadius: 14, alignItems: 'center' }, buttonText: { color: 'white', fontWeight: '800' },
  range: { flexDirection: 'row', gap: 10 }, rangeButton: { padding: 13, borderRadius: 14, backgroundColor: colours.greenSoft },
  axis: { fontSize: 11, color: colours.muted }, chart: { paddingVertical: 8, gap: 4 }, column: { width: 58, alignItems: 'center', gap: 5 },
  track: { height: 122, width: 44, justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colours.border },
  target: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colours.muted },
  smallValue: { fontSize: 10, color: colours.ink }, missing: { color: colours.muted }, day: { fontSize: 10, color: colours.muted },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colours.border, paddingVertical: 10 }, date: { flex: 1.3, color: colours.ink, fontSize: 12 }, cell: { flex: 1, color: colours.ink, fontSize: 12, textAlign: 'right' },
});
