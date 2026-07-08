import React, { useState, useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/spacing';
import { useTheme } from '@/app/contexts/ThemeContext';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_SHORT = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

type PeriodOption = { mois: number; annee: number; label: string };

interface PeriodSelectorProps {
  selectedMonth: number;
  selectedYear: number;
  onChange: (month: number, year: number) => void;
  onChangeDate?: (date: Date) => void;
  selectedDate?: string;
  availablePeriods?: { mois?: number; annee?: number; debut?: string; fin?: string; label?: string; id?: string }[];
  showCurrentMonthOption?: boolean;
  triggerColor?: string;
  periodType?: string;
  onTypeChange?: (type: string) => void;
}

const PERIOD_TYPES = [
  { value: 'quotidien', label: 'Jour', icon: 'today-outline' as const },
  { value: 'hebdomadaire', label: 'Semaine', icon: 'calendar-outline' as const },
  { value: 'mensuel', label: 'Mois', icon: 'calendar-outline' as const },
];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getSunday(date: Date): Date {
  const mon = getMonday(date);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return sun;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWeekNumber(date: Date): number {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - jan1.getTime()) / 86400000);
  return Math.ceil((days + jan1.getDay() + 1) / 7);
}

export default function PeriodSelector({
  selectedMonth,
  selectedYear,
  onChange,
  onChangeDate,
  selectedDate,
  availablePeriods,
  showCurrentMonthOption = true,
  triggerColor,
  periodType,
  onTypeChange,
}: PeriodSelectorProps) {
  const { colors: C, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const tc = triggerColor ?? C.text;
  const mc = triggerColor ?? C.muted;

  const typeLabel = periodType
    ? PERIOD_TYPES.find(t => t.value === periodType)?.label || 'Mois'
    : 'Mois';

  const s = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      borderRadius: 20,
      height: 36,
      paddingHorizontal: Spacing.md,
      gap: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    },
    triggerText: {
      fontSize: 13,
      fontWeight: '600',
      color: tc,
    },
    triggerArrow: {
      fontSize: 9,
      color: mc,
    },
    typeBadge: {
      backgroundColor: C.purple + '20',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: 4,
    },
    typeBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: tc,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      backgroundColor: C.white,
      borderRadius: Radius.xl,
      padding: Spacing.sm,
      width: 280,
      maxHeight: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 16,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: C.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xs,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.md,
      marginBottom: 2,
    },
    itemActive: {
      backgroundColor: C.surface,
    },
    itemText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: C.text,
    },
    itemTextActive: {
      fontWeight: '700',
      color: C.purple,
    },
    itemCheck: {
      fontSize: 15,
      fontWeight: '700',
      color: C.purple,
    },
    typeRow: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xs,
      gap: 6,
    },
    typeChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    typeChipActive: {
      backgroundColor: C.purple,
    },
    typeChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: C.muted,
    },
    typeChipTextActive: {
      color: '#fff',
    },
  }), [C, isDark, tc, mc]);

  const now = new Date();
  const currentM = now.getMonth() + 1;
  const currentY = now.getFullYear();

  const prevM = currentM === 1 ? 12 : currentM - 1;
  const prevY = currentM === 1 ? currentY - 1 : currentY;

  let currentLabel: string;
  if (periodType === 'quotidien' || periodType === 'hebdomadaire') {
    if (selectedDate) {
      const d = new Date(selectedDate + 'T00:00:00');
      if (periodType === 'quotidien') {
        const today = formatDate(now);
        const yesterday = formatDate(addDays(now, -1));
        currentLabel = selectedDate === today ? "Aujourd'hui" : selectedDate === yesterday ? 'Hier' : `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
      } else {
        const mon = getMonday(d);
        const sun = getSunday(d);
        const sameMon = mon.getMonth() === sun.getMonth();
        currentLabel = sameMon
          ? `${mon.getDate()}-${sun.getDate()} ${MONTHS[mon.getMonth()]}`
          : `${mon.getDate()} ${MONTHS[mon.getMonth()]}-${sun.getDate()} ${MONTHS[sun.getMonth()]}`;
      }
    } else {
      currentLabel = `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
    }
  } else {
    currentLabel = `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
  }

  const periods = useMemo(() => {
    if (availablePeriods && availablePeriods.length > 0 && periodType !== 'quotidien' && periodType !== 'hebdomadaire') {
      return availablePeriods.map(p => ({
        ...p,
        label: p.label || `${MONTHS[p.mois! - 1]} ${p.annee}`,
      }));
    }

    if (periodType === 'quotidien') {
      const days: (PeriodOption & { date?: Date })[] = [];
      for (let i = 0; i < 30; i++) {
        const d = addDays(now, -i);
        const lab = i === 0 ? "Aujourd'hui" : i === 1 ? 'Hier' : `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
        days.push({ date: d, mois: d.getMonth() + 1, annee: d.getFullYear(), label: lab });
      }
      return days;
    }

    if (periodType === 'hebdomadaire') {
      const weeks: (PeriodOption & { date?: Date })[] = [];
      for (let i = 0; i < 12; i++) {
        const mon = getMonday(addDays(now, -i * 7));
        const sun = getSunday(mon);
        const weekNum = getWeekNumber(mon);
        const sameMon = mon.getMonth() === sun.getMonth();
        const lab = i === 0 ? 'Cette semaine' : sameMon
          ? `Sem. ${weekNum} (${mon.getDate()}-${sun.getDate()} ${MONTHS[mon.getMonth()]})`
          : `Sem. ${weekNum} (${mon.getDate()} ${MONTHS[mon.getMonth()]}-${sun.getDate()} ${MONTHS[sun.getMonth()]})`;
        weeks.push({ date: mon, mois: mon.getMonth() + 1, annee: mon.getFullYear(), label: lab });
      }
      return weeks;
    }

    const result: PeriodOption[] = [];
    if (showCurrentMonthOption) {
      result.push({ mois: currentM, annee: currentY, label: `${MONTHS[currentM - 1]} ${currentY}` });
    }
    for (let i = 0; i < 12; i++) {
      const m = currentM - i;
      const mo = ((m + 11) % 12) + 1;
      const yr = currentY + (m <= 0 ? -1 : 0);
      if (mo === currentM && yr === currentY && showCurrentMonthOption) continue;
      result.push({ mois: mo, annee: yr, label: `${MONTHS[mo - 1]} ${yr}` });
    }
    return result;
  }, [availablePeriods, showCurrentMonthOption, periodType]);

  const grouped = useMemo(() => {
    if (periodType === 'quotidien' || periodType === 'hebdomadaire') return [];
    const map: Record<number, any[]> = {};
    for (const p of periods) {
      const yr = p.annee ?? 0;
      if (!map[yr]) map[yr] = [];
      map[yr].push(p);
    }
    return Object.entries(map).sort(([a], [b]) => Number(b) - Number(a));
  }, [periods, periodType]);

  function isDateSelected(d: Date): boolean {
    if (!selectedDate) return false;
    return formatDate(d) === selectedDate;
  }

  return (
    <>
      <TouchableOpacity style={s.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={14} color={mc} />
        <Text style={s.triggerText} numberOfLines={1}>{currentLabel}</Text>
        {periodType && (
          <View style={s.typeBadge}>
            <Text style={s.typeBadgeText}>{typeLabel}</Text>
          </View>
        )}
        <Ionicons name="chevron-down" size={11} color={C.hint} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={s.card}>
            {onTypeChange && (
              <View style={s.typeRow}>
                {PERIOD_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    style={[s.typeChip, periodType === t.value && s.typeChipActive]}
                    onPress={() => { onTypeChange(t.value); setOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={t.icon} size={12} color={periodType === t.value ? '#fff' : C.muted} />
                    <Text style={[s.typeChipText, periodType === t.value && s.typeChipTextActive]}> {t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <ScrollView style={{ maxHeight: 360 }}>
              {(periodType === 'quotidien' || periodType === 'hebdomadaire') ? (
                <>
                  {periodType === 'quotidien' && (
                    <>
                      <TouchableOpacity
                        style={[s.item, isDateSelected(now) && s.itemActive]}
                        onPress={() => { onChangeDate?.(now); setOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.itemText, isDateSelected(now) && s.itemTextActive]}>📅 Aujourd'hui</Text>
                        {isDateSelected(now) && <Text style={s.itemCheck}>✓</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.item, isDateSelected(addDays(now, -1)) && s.itemActive]}
                        onPress={() => { onChangeDate?.(addDays(now, -1)); setOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.itemText, isDateSelected(addDays(now, -1)) && s.itemTextActive]}>📅 Hier</Text>
                        {isDateSelected(addDays(now, -1)) && <Text style={s.itemCheck}>✓</Text>}
                      </TouchableOpacity>
                      <View style={{ height: 1, backgroundColor: C.border, marginVertical: Spacing.sm, marginHorizontal: Spacing.lg }} />
                    </>
                  )}
                  {periodType === 'hebdomadaire' && (
                    <>
                      <TouchableOpacity
                        style={[s.item, isDateSelected(getMonday(now)) && s.itemActive]}
                        onPress={() => { onChangeDate?.(getMonday(now)); setOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.itemText, isDateSelected(getMonday(now)) && s.itemTextActive]}>📅 Cette semaine</Text>
                        {isDateSelected(getMonday(now)) && <Text style={s.itemCheck}>✓</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.item, isDateSelected(getMonday(addDays(now, -7))) && s.itemActive]}
                        onPress={() => { onChangeDate?.(getMonday(addDays(now, -7))); setOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.itemText, isDateSelected(getMonday(addDays(now, -7))) && s.itemTextActive]}>📅 Semaine dernière</Text>
                        {isDateSelected(getMonday(addDays(now, -7))) && <Text style={s.itemCheck}>✓</Text>}
                      </TouchableOpacity>
                      <View style={{ height: 1, backgroundColor: C.border, marginVertical: Spacing.sm, marginHorizontal: Spacing.lg }} />
                    </>
                  )}
                  {periods.map((p: any) => {
                    const active = p.date ? isDateSelected(p.date) : (p.mois === selectedMonth && p.annee === selectedYear);
                    return (
                      <TouchableOpacity
                        key={p.date ? formatDate(p.date) : `${p.mois}-${p.annee}`}
                        style={[s.item, active && s.itemActive]}
                        onPress={() => { p.date ? onChangeDate?.(p.date) : onChange(p.mois, p.annee); setOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.itemText, active && s.itemTextActive]}>{p.label}</Text>
                        {active && <Text style={s.itemCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : (
                <>
                  {/* Raccourcis mensuels */}
                  {periodType !== 'quotidien' && periodType !== 'hebdomadaire' && (
                    <>
                      <TouchableOpacity
                        style={[s.item, selectedMonth === currentM && selectedYear === currentY && s.itemActive]}
                        onPress={() => { onChange(currentM, currentY); setOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.itemText, selectedMonth === currentM && selectedYear === currentY && s.itemTextActive]}>📅 Ce mois</Text>
                        {selectedMonth === currentM && selectedYear === currentY && <Text style={s.itemCheck}>✓</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.item, selectedMonth === prevM && selectedYear === prevY && s.itemActive]}
                        onPress={() => { onChange(prevM, prevY); setOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.itemText, selectedMonth === prevM && selectedYear === prevY && s.itemTextActive]}>📅 Mois précédent</Text>
                        {selectedMonth === prevM && selectedYear === prevY && <Text style={s.itemCheck}>✓</Text>}
                      </TouchableOpacity>
                      <View style={{ height: 1, backgroundColor: C.border, marginVertical: Spacing.sm, marginHorizontal: Spacing.lg }} />
                    </>
                  )}
                  {grouped.map(([annee, items]) => (
                    <View key={annee}>
                      <Text style={s.sectionTitle}>{annee}</Text>
                      {items.map((p) => {
                        const isActive = p.mois === selectedMonth && p.annee === selectedYear;
                        return (
                          <TouchableOpacity
                            key={`${p.mois}-${p.annee}`}
                            style={[s.item, isActive && s.itemActive]}
                            onPress={() => { onChange(p.mois, p.annee); setOpen(false); }}
                            activeOpacity={0.7}
                          >
                            <Text style={[s.itemText, isActive && s.itemTextActive]}>{p.label}</Text>
                            {isActive && <Text style={s.itemCheck}>✓</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
