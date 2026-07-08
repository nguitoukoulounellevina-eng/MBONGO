import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '@/app/services/api';
import { Spacing, Radius } from '@/constants/spacing';
import { fmt } from '@/app/utils/format';
import { useTheme } from '@/app/contexts/ThemeContext';
import { formatMonthYear } from '@/app/services/periodService';
import { PageHeader } from '@/app/components/PageHeader';

type PeriodItem = { mois?: number; annee?: number; debut?: string; fin?: string; label?: string; id?: string };

export default function Archives() {
  const insets = useSafeAreaInsets();
  const { colors: C, isDark } = useTheme();
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [summaries, setSummaries] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    body: { padding: Spacing.lg },
    yearSection: { marginBottom: Spacing.lg },
    yearHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    yearArrow: { fontSize: 13, color: C.muted, marginRight: Spacing.sm },
    yearTitle: { fontSize: 17, fontWeight: '800', color: C.dark, letterSpacing: -0.3 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.sm },
    left: { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
    info: { flex: 1 },
    name: { fontSize: 14, fontWeight: '700', color: C.dark },
    meta: { fontSize: 11, color: C.muted, marginTop: 2 },
    right: { alignItems: 'flex-end' },
    soldeTxt: { fontSize: 14, fontWeight: '800' },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyWrap: { alignItems: 'center', paddingVertical: 60 },
    emptyIco: { fontSize: 48, marginBottom: Spacing.md },
    emptyTxt: { fontSize: 15, fontWeight: '600', color: C.muted, textAlign: 'center' },
  }), [C, insets]);

  const periodKey = (p: PeriodItem) => p.id || p.debut || `${p.annee}-${p.mois}`;
  const periodYear = (p: PeriodItem) => p.annee || (p.debut ? new Date(p.debut).getFullYear() : 0);
  const periodLabel = (p: PeriodItem) => p.label || (p.mois ? formatMonthYear(p.mois, p.annee!) : periodKey(p));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const m = await api.archive.months();
      const list = Array.isArray(m) ? m : [];
      setPeriods(list);
      const sumMap: Record<string, any> = {};
      await Promise.all(list.map(async (p: PeriodItem) => {
        try {
          const s = await api.archive.summary({ debut: p.debut, fin: p.fin, mois: p.mois, annee: p.annee });
          sumMap[periodKey(p)] = s;
        } catch {}
      }));
      setSummaries(sumMap);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const grouped = useMemo(() => {
    const map: Record<number, PeriodItem[]> = {};
    for (const p of periods) {
      const yr = periodYear(p);
      if (!map[yr]) map[yr] = [];
      map[yr].push(p);
    }
    return Object.entries(map).sort(([a], [b]) => Number(b) - Number(a));
  }, [periods]);

  const toggleYear = (year: number) => {
    setExpanded(prev => ({ ...prev, [year]: !(prev[year] ?? true) }));
  };

  const renderPeriod = (p: PeriodItem) => {
    const key = periodKey(p);
    const sum = summaries[key];
    const rev = sum?.resume?.revenus ?? 0;
    const dep = sum?.resume?.depenses ?? 0;
    const solde = rev - dep;
    const params = p.debut && p.fin ? `debut=${p.debut}&fin=${p.fin}` : `mois=${p.mois}&annee=${p.annee}`;
    return (
      <TouchableOpacity
        key={key}
        style={s.card}
        onPress={() => router.push(`/archive_detail?${params}`)}
        activeOpacity={0.7}
      >
        <View style={[s.left, { backgroundColor: solde >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.12)' }]}>
          <Ionicons
            name={solde >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
            size={18}
            color={solde >= 0 ? C.green : C.danger}
          />
        </View>
        <View style={s.info}>
          <Text style={s.name}>{periodLabel(p)}</Text>
          <Text style={s.meta}>
            Revenus: {fmt(rev)} · Dépenses: {fmt(dep)}
          </Text>
        </View>
        <View style={s.right}>
          <Text style={[s.soldeTxt, { color: solde >= 0 ? C.green : C.danger }]}>
            {solde >= 0 ? '+' : ''}{fmt(solde)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[s.root]}>
        <StatusBar style="dark" />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.purple} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <PageHeader title="Archives financières" subtitle="Consultez l'historique de tous vos mois" icon="📚" color={C.dark} backRoute="/plus" />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {periods.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIco}>📭</Text>
            <Text style={s.emptyTxt}>Aucune archive disponible{'\n'}Ajoutez des données pour commencer</Text>
          </View>
        ) : (
          grouped.map(([annee, items]) => {
            const isOpen = expanded[Number(annee)] ?? true;
            return (
              <View key={annee} style={s.yearSection}>
                <TouchableOpacity style={s.yearHeader} onPress={() => toggleYear(Number(annee))} activeOpacity={0.7}>
                  <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={13} color={C.muted} style={{marginRight: Spacing.sm}} />
                  <Text style={s.yearTitle}>{annee}</Text>
                </TouchableOpacity>
                {isOpen && items.map(p => renderPeriod(p))}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}