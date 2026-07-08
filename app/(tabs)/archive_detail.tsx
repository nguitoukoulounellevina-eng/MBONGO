import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '@/app/services/api';
import { Spacing, Radius } from '@/constants/spacing';
import { fmt } from '@/app/utils/format';
import { PageHeader } from '@/app/components/PageHeader';
import { useTheme } from '@/app/contexts/ThemeContext';
import { formatMonthYear } from '@/app/services/periodService';

export default function ArchiveDetail() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const params = useLocalSearchParams<{ mois?: string; annee?: string; debut?: string; fin?: string }>();
  const m = parseInt(params.mois || '0');
  const y = parseInt(params.annee || '0');
  const debut = params.debut;
  const fin = params.fin;
  const hasDebutFin = !!(debut && fin);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const periodLabel =
    hasDebutFin
      ? `${debut} -> ${fin}`
      : formatMonthYear(m, y);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { padding: Spacing.lg, paddingBottom: 60 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: C.text, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md, marginTop: Spacing.lg },
    card: { backgroundColor: C.white, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.md },
    cardTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: Spacing.md },
    summaryRow: { flexDirection: 'row', gap: Spacing.sm },
    summaryCard: { flex: 1, backgroundColor: C.white, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    summaryIco: { fontSize: 17, marginBottom: Spacing.xs },
    summaryVal: { fontSize: 13, fontWeight: '800', color: C.text },
    summaryLbl: { fontSize: 10, color: C.muted, marginTop: 2 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: C.border },
    rowLast: { borderBottomWidth: 0 },
    rowIco: { fontSize: 16, width: 28, textAlign: 'center' },
    rowLbl: { flex: 1, fontSize: 13, fontWeight: '600', color: C.text, marginLeft: Spacing.sm },
    rowVal: { fontSize: 13, fontWeight: '700' },
    emptyTxt: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: Spacing.lg },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    analyseCard: { backgroundColor: C.white, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.md },
    analyseScore: { fontSize: 24, fontWeight: '900', color: C.purple, textAlign: 'center' },
    analyseLabel: { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 2 },
    recoItem: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: C.border },
    recoItemLast: { borderBottomWidth: 0 },
    recoIco: { fontSize: 18 },
    recoContent: { flex: 1 },
    recoTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
    recoDesc: { fontSize: 11, color: C.muted, lineHeight: 16 },
  }), [C]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.archive.summary(hasDebutFin ? { debut, fin } : { mois: m, annee: y });
      setData(d);
    } catch (e: any) {
      setError(e?.message || 'Impossible de charger les données pour cette période.');
    }
    setLoading(false);
  }, [m, y, debut, fin]);

  useEffect(() => {
    if (!hasDebutFin && (!m || !y)) return;
    loadData();
  }, [m, y, debut, fin]);

  if (!hasDebutFin && (!m || !y)) {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <PageHeader title="Archives" color={C.dark} backRoute="/archives" />
        <View style={s.loadingWrap}>
          <Text style={{ color: C.muted, fontSize: 15, textAlign: 'center' }}>Paramètres de navigation invalides.</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <PageHeader title={`Archives — ${periodLabel}`} color={C.dark} backRoute="/archives" />
        <View style={s.loadingWrap}>
          <Text style={{ color: C.danger, fontSize: 15, textAlign: 'center', paddingHorizontal: Spacing.lg, lineHeight: 22 }}>{error}</Text>
          <TouchableOpacity
            onPress={() => { setLoading(true); setError(null); setData(null); loadData(); }}
            style={{ marginTop: Spacing.lg, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.purple, borderRadius: Radius.md }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading || !data) {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <PageHeader title="Chargement..." color={C.dark} backRoute="/archives" />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.purple} />
        </View>
      </View>
    );
  }

  const { resume, analyse, objectifs, revenus, depenses, budgets } = data;
  const solde = (resume?.revenus ?? 0) - (resume?.depenses ?? 0);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <PageHeader title={`Archives — ${periodLabel}`} color={C.dark} backRoute="/archives" />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── Résumé ─── */}
        <View style={s.summaryRow}>
          {[
            { lbl: 'Revenus', val: resume?.revenus ?? 0, color: C.green, ico: 'arrow-up' },
            { lbl: 'Dépenses', val: resume?.depenses ?? 0, color: C.danger, ico: 'arrow-down' },
            { lbl: 'Solde', val: solde, color: solde >= 0 ? C.green : C.danger, ico: solde >= 0 ? '🏦' : '⚠️' },
          ].map((r, i) => (
            <View key={i} style={s.summaryCard}>
              <Ionicons name={r.ico} size={24} color={r.color} />
              <Text style={[s.summaryVal, { color: r.color }]}>{fmt(r.val)}</Text>
              <Text style={s.summaryLbl}>{r.lbl}</Text>
            </View>
          ))}
        </View>

        {/* ─── Budget Mensuel ─── */}
        {(() => {
          const mensuels = budgets?.filter((b: any) => b.periode_type === 'mensuel') || [];
          if (mensuels.length === 0) return null;
          return (
            <>
              <Text style={s.sectionTitle}>📊 Budget mensuel</Text>
              <View style={s.card}>
                <Text style={s.cardTitle}>
                  {fmt(resume?.budget?.utilise ?? 0)} / {fmt(resume?.budget?.prevu ?? 0)} FCFA
                </Text>
                {mensuels.map((b: any, i: number) => (
                  <View key={b.id || i} style={[s.row, i === mensuels.length - 1 && s.rowLast]}>
                    <Text style={s.rowIco}>{b.categorie_icone || '📦'}</Text>
                    <Text style={s.rowLbl} numberOfLines={1}>{b.categorie_libelle || 'Catégorie'}</Text>
                    <Text style={[s.rowVal, { color: C.warning }]}>{fmt(b.montant_prevu)}</Text>
                  </View>
                ))}
              </View>
            </>
          );
        })()}

        {/* ─── Budget Journalier ─── */}
        {(() => {
          const quotidiens = budgets?.filter((b: any) => b.periode_type === 'quotidien' || b.periode_type === 'hebdomadaire') || [];
          if (quotidiens.length === 0) return null;
          const groupedByDate = quotidiens.reduce((acc: Record<string, any[]>, b: any) => {
            const key = b.date_debut || 'autre';
            if (!acc[key]) acc[key] = [];
            acc[key].push(b);
            return acc;
          }, {});
          return (
            <>
              <Text style={s.sectionTitle}>📋 Budget journalier</Text>
              {Object.entries(groupedByDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => (
                <View key={date} style={s.card}>
                  <Text style={s.cardTitle}>📅 {date}</Text>
                  {items.map((b: any, i: number) => (
                    <View key={b.id || i} style={[s.row, i === items.length - 1 && s.rowLast]}>
                      <Text style={s.rowIco}>{b.categorie_icone || '📦'}</Text>
                      <Text style={s.rowLbl} numberOfLines={1}>{b.categorie_libelle || 'Catégorie'}</Text>
                      <Text style={[s.rowVal, { color: C.warning }]}>{fmt(b.montant_prevu)}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </>
          );
        })()}

        {/* ─── Revenus ─── */}
        {revenus && revenus.length > 0 && (
          <>
            <Text style={s.sectionTitle}>💰 Revenus</Text>
            <View style={s.card}>
              {revenus.map((r: any, i: number) => (
                <View key={r.id || i} style={[s.row, i === revenus.length - 1 && s.rowLast]}>
                  <Text style={s.rowIco}>{r.categorie_icone || '💰'}</Text>
                  <Text style={s.rowLbl}>{r.libelle || r.categorie_libelle || 'Revenu'}</Text>
                  <Text style={[s.rowVal, { color: C.green }]}>+{fmt(r.montant)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ─── Dépenses ─── */}
        {depenses && depenses.length > 0 && (
          <>
            <Text style={s.sectionTitle}>💸 Dépenses</Text>
            <View style={s.card}>
              {depenses.map((d: any, i: number) => (
                <View key={d.id || i} style={[s.row, i === depenses.length - 1 && s.rowLast]}>
                  <Text style={s.rowIco}>{d.categorie_icone || '💸'}</Text>
                  <Text style={s.rowLbl}>{d.libelle || d.categorie_libelle || 'Dépense'}</Text>
                  <Text style={[s.rowVal, { color: C.danger }]}>-{fmt(d.montant)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ─── Objectifs ─── */}
        {objectifs && objectifs.length > 0 && (
          <>
            <Text style={s.sectionTitle}>🎯 Objectifs</Text>
            <View style={s.card}>
              {objectifs.map((o: any, i: number) => (
                <View key={o.id || i} style={[s.row, i === objectifs.length - 1 && s.rowLast]}>
                  <Text style={s.rowIco}>{o.icone || '🎯'}</Text>
                  <Text style={s.rowLbl}>{o.titre}</Text>
                  <Text style={[s.rowVal, { color: o.statut === 'atteint' ? C.green : o.statut === 'annule' ? C.danger : C.warning }]}>
                    {o.statut === 'atteint' ? '✅' : o.statut === 'annule' ? '❌' : '🔄'} {fmt(o.montant_actuel)}/{fmt(o.montant_cible)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ─── Analyse IA ─── */}
        {analyse && (
          <>
            <Text style={s.sectionTitle}>🤖 Analyse IA</Text>
            <View style={s.analyseCard}>
              <Text style={s.analyseScore}>{analyse.score_financier || '-'}/100</Text>
              <Text style={s.analyseLabel}>Score financier</Text>
              {analyse.taux_epargne !== undefined && (
                <Text style={[s.analyseLabel, { marginTop: Spacing.xs }]}>
                  Taux d'épargne : {analyse.taux_epargne}%
                </Text>
              )}
            </View>
            {analyse.recommandations && Array.isArray(analyse.recommandations) && analyse.recommandations.length > 0 && (
              <View style={s.analyseCard}>
                <Text style={[s.cardTitle, { marginBottom: Spacing.sm }]}>Recommandations</Text>
                {analyse.recommandations.map((rec: any, i: number) => (
                  <View key={i} style={[s.recoItem, i === analyse.recommandations.length - 1 && s.recoItemLast]}>
                    <Text style={s.recoIco}>{rec.ico || '💡'}</Text>
                    <View style={s.recoContent}>
                      <Text style={s.recoTitle}>{rec.titre}</Text>
                      <Text style={s.recoDesc}>{rec.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
