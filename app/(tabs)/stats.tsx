import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import api from '@/app/services/api';
import { Spacing, Radius } from '@/constants/spacing';
import { fmt } from '@/app/utils/format';
import { PageHeader } from '@/app/components/PageHeader';
import { useTheme } from '@/app/contexts/ThemeContext';
import PeriodSelector from '@/app/components/PeriodSelector';
import { Ionicons } from '@expo/vector-icons';
import { usePeriod, formatMonthYear } from '@/app/services/periodService';

const CHART_HEIGHT = 260;

const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export default function Stats() {
  const { colors: C } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    root:{ flex:1, backgroundColor:C.bg },
    scroll:{ flexGrow:1, paddingVertical:0 },
    loadingWrap:{ flex:1, alignItems:'center', justifyContent:'center' },
    loadingTxt:{ marginTop:Spacing.md, fontSize:14, color:C.muted },
    body:{ padding:Spacing.lg },
    sectionTitle:{ fontSize:11, fontWeight:'800', color:C.text, textTransform:'uppercase', letterSpacing:0.8, marginBottom:Spacing.md },
    card:{ backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.lg, borderWidth:1, borderColor:C.border, marginBottom:24 },
    cardTitle:{ fontSize:13, fontWeight:'700', color:C.text, marginBottom:Spacing.md },
    summaryRow:{ flexDirection:'row', gap:Spacing.sm, marginBottom:20 },
    summaryCard:{ flex:1, backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.md, alignItems:'center', borderWidth:1, borderColor:C.border },
    summaryIco:{ fontSize:17, marginBottom:Spacing.xs },
    summaryVal:{ fontSize:12, fontWeight:'800', color:C.text },
    summaryLbl:{ fontSize:10, color:C.muted, marginTop:2 },
    savingsRate:{ fontSize:9, fontWeight:'700', color:C.blue, marginTop:3 },
    topRow:{ flexDirection:'row', alignItems:'center', marginBottom:Spacing.sm },
    topMedal:{ fontSize:15, width:24 },
    topIco:{ fontSize:17, marginRight:Spacing.sm, width:24, textAlign:'center' },
    topLabel:{ fontSize:12, fontWeight:'600', color:C.text, width:80 },
    topBarWrap:{ flex:1, height:6, backgroundColor:C.surface, borderRadius:3, marginHorizontal:Spacing.sm, overflow:'hidden' },
    topBar:{ height:6, borderRadius:3 },
    topAmount:{ fontSize:12, fontWeight:'700', color:C.text, width:65, textAlign:'right' },
    stackedBar:{ flexDirection:'row', height:12, borderRadius:6, overflow:'hidden', marginBottom:Spacing.lg, backgroundColor:C.surface },
    stackedSeg:{ height:12 },
    pieRow:{ flexDirection:'row', alignItems:'center', marginBottom:Spacing.sm },
    pieIco:{ fontSize:15, marginRight:Spacing.sm, width:22, textAlign:'center' },
    pieLabel:{ fontSize:12, color:C.text, width:85 },
    pieBarWrap:{ flex:1, height:8, backgroundColor:C.surface, borderRadius:4, marginHorizontal:Spacing.sm, overflow:'hidden' },
    pieBar:{ height:8, borderRadius:4 },
    piePct:{ fontSize:11, fontWeight:'700', color:C.text, width:28, textAlign:'right' },
    pieAmount:{ fontSize:11, color:C.muted, width:60, textAlign:'right' },
    legend:{ flexDirection:'row', gap:Spacing.lg, marginBottom:Spacing.md },
    legendItem:{ flexDirection:'row', alignItems:'center', gap:5 },
    dot:{ width:8, height:8, borderRadius:4 },
    legendTxt:{ fontSize:11, color:C.muted },
    chart:{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end', paddingTop:Spacing.sm },
    barGroup:{ alignItems:'center', gap:2, flex:1 },
    barMonth:{ fontSize:10, fontWeight:'600', color:C.text },
    barYear:{ fontSize:8, color:C.muted, marginBottom:2 },
    bars:{ flexDirection:'row', gap:3, alignItems:'flex-end', flex:1, justifyContent:'center' },
    bar:{ width:12, borderRadius:4 },
    goalTitle:{ fontSize:15, fontWeight:'700', color:C.text, marginBottom:Spacing.xs },
    goalAmountRow:{ flexDirection:'row', alignItems:'baseline', marginBottom:Spacing.sm },
    goalAmount:{ fontSize:17, fontWeight:'800', color:C.blue },
    goalSep:{ fontSize:13, color:C.muted },
    goalTarget:{ fontSize:13, fontWeight:'600', color:C.muted },
    goalBarWrap:{ height:10, backgroundColor:C.surface, borderRadius:5, overflow:'hidden', marginBottom:Spacing.xs },
    goalBar:{ height:10, borderRadius:5, backgroundColor:C.blue },
    goalPct:{ fontSize:12, fontWeight:'700', color:C.blue, textAlign:'right' },
    empty:{ alignItems:'center', paddingVertical:Spacing.xl },
    emptyIco:{ fontSize:37, marginBottom:Spacing.md },
    emptyTxt:{ fontSize:15, fontWeight:'600', color:C.muted, marginBottom:Spacing.xs },
    emptySub:{ fontSize:12, color:C.muted, textAlign:'center', opacity:0.7 },
  }), [C]);
  const period = usePeriod();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resume, setResume] = useState<{ revenus: number; depenses: number; epargne: number; objectif_cible?: number; taux_progression?: number; top_categories: any[] } | null>(null);
  const [repartition, setRepartition] = useState<any[]>([]);
  const [evolution, setEvolution] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);

  const [compareMonth, setCompareMonth] = useState(period.month === 1 ? 12 : period.month - 1);
  const [compareYear, setCompareYear] = useState(period.month === 1 ? period.year - 1 : period.year);
  const [resumePrev, setResumePrev] = useState<{ revenus: number; depenses: number; epargne: number } | null>(null);

  const fetchData = async () => {
    try {
      const [r, rep, ev, g, rPrev] = await Promise.all([
        api.stats.resume(),
        api.stats.repartition(),
        api.stats.evolution(),
        api.objectifs.list(),
        api.stats.resume({ mois: compareMonth, annee: compareYear }),
      ]);
      setResume(r);
      setResumePrev(rPrev);
      setRepartition(rep);
      setEvolution(ev);
      setGoals(g);
    } catch (e) {
      setResume(null);
      setResumePrev(null);
      setRepartition([]);
      setEvolution([]);
      setGoals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); period.loadAvailablePeriods(); }, [period.month, period.year, compareMonth, compareYear]));

  const now = useMemo(() => new Date(), []);

  const diff = useMemo(() => {
    if (!resumePrev || !resume) return null;
    const calc = (curr: number, prev: number) => {
      const abs = curr - prev;
      const pct = prev > 0 ? ((abs / prev) * 100).toFixed(1) : (curr > 0 ? '+100' : '0');
      return { abs, pct, dir: abs > 0 ? 'up' : abs < 0 ? 'down' : 'same' };
    };
    return {
      revenus: calc(resume.revenus, resumePrev.revenus),
      depenses: calc(resume.depenses, resumePrev.depenses),
      epargne: calc(resume.epargne, resumePrev.epargne),
    };
  }, [resume, resumePrev]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const maxChartVal = evolution.reduce((m, e) => Math.max(m, e.revenus, e.depenses), 0);

  if (loading) {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <PageHeader title="Statistiques" icon="📈" color={C.dark} />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.blue} />
          <Text style={s.loadingTxt}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <PageHeader title="Statistiques" icon="📈" color={C.dark} />
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.white} />}
      >
        <View style={s.body}>
          {/* ─── Sélecteurs période ─── */}
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, alignItems: 'center' }}>
            <PeriodSelector
              selectedMonth={period.month}
              selectedYear={period.year}
              onChange={period.changePeriod}
              onChangeDate={period.changeDate}
              selectedDate={period.current.debut}
              periodType={period.type}
              onTypeChange={(t) => period.changeToPeriod(t)}
              availablePeriods={period.availablePeriods}
            />
            <Text style={{ fontSize: 11, color: C.muted, fontWeight: '700' }}>vs</Text>
            <PeriodSelector
              selectedMonth={compareMonth}
              selectedYear={compareYear}
              onChange={(m, y) => { setCompareMonth(m); setCompareYear(y); }}
              availablePeriods={period.availablePeriods}
            />
          </View>

          {/* ─── Résumé du mois ─── */}
          <Text style={s.sectionTitle}>Résumé — {formatMonthYear(period.month, period.year)}</Text>
          <View style={s.summaryRow}>
            {[
              { lbl:'Revenus',  val:resume?.revenus ?? 0, color:C.green,  ico:'arrow-up' },
              { lbl:'Dépenses', val:resume?.depenses ?? 0, color:C.danger, ico:'arrow-down' },
              { lbl:'Épargne',  val:resume?.epargne ?? 0, color: (resume?.epargne ?? 0) >= 0 ? C.blue : C.danger, ico: (resume?.epargne ?? 0) >= 0 ? '🏦' : '⚠️' },
            ].map((r,i)=>(
              <View key={i} style={s.summaryCard}>
                <Ionicons name={r.ico} size={20} color={r.color} />
                <Text style={s.summaryVal}>{fmt(r.val)}</Text>
                <Text style={s.summaryLbl}>{r.lbl}</Text>
                {i === 2 && resume?.objectif_cible && resume.objectif_cible > 0 && (
                  <Text style={s.savingsRate}>Progression : {resume.taux_progression}%</Text>
                )}
              </View>
            ))}
          </View>

          {/* ─── Comparaison automatique ─── */}
          {diff && (
            <View style={[s.card, { marginTop: Spacing.sm }]}>
              <Text style={s.cardTitle}>📊 Comparaison avec {formatMonthYear(compareMonth, compareYear)}</Text>
              {[
                { label: 'Revenus', d: diff.revenus, ico: '📈', colorUp: C.green, colorDown: C.danger },
                { label: 'Dépenses', d: diff.depenses, ico: '💳', colorUp: C.danger, colorDown: C.green },
                { label: 'Épargne', d: diff.epargne, ico: '🏦', colorUp: C.green, colorDown: C.danger },
              ].map((item, i) => {
                const isUp = item.d.dir === 'up';
                const isDown = item.d.dir === 'down';
                const clr = isUp ? item.colorUp : isDown ? item.colorDown : C.muted;
                const arrow = isUp ? 'arrow-up' : isDown ? 'arrow-down' : 'remove';
                return (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: C.border }}>
                    <Text style={{ fontSize: 15, width: 24 }}>{item.ico}</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: C.text }}>{item.label}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: clr }}>
                        {item.d.abs >= 0 ? '+' : ''}{fmt(item.d.abs)}
                      </Text>
                      <View style={{ flexDirection:'row', alignItems:'center' }}>
                        <Ionicons name={arrow} size={11} color={clr} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: clr, marginLeft:2 }}>{item.d.pct}%</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ─── Top catégories ─── */}
          {resume?.top_categories && resume.top_categories.length > 0 && (
            <View style={[s.card, { marginTop: Spacing.md }]}>
              <Text style={s.cardTitle}>🏆 Top catégories de dépenses</Text>
              {resume.top_categories.map((cat: any, i: number) => {
                const maxTop = Math.max(...resume.top_categories.map((c: any) => parseFloat(c.total) || 0));
                const pct = maxTop > 0 ? ((parseFloat(cat.total) || 0) / maxTop) * 100 : 0;
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <View key={i} style={s.topRow}>
                    <Text style={s.topMedal}>{medals[i] || `#${i+1}`}</Text>
                    <Text style={s.topIco}>{cat.icone || '📦'}</Text>
                    <Text style={s.topLabel}>{cat.libelle || 'Sans catégorie'}</Text>
                    <View style={s.topBarWrap}>
                      <View style={[s.topBar, { width: `${pct}%`, backgroundColor: cat.couleur || C.muted }]} />
                    </View>
                    <Text style={s.topAmount}>{fmt(cat.total)}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* ─── Répartition des dépenses ─── */}
          <Text style={[s.sectionTitle, { marginTop: Spacing.lg }]}>Répartition des dépenses</Text>
          {repartition.length === 0 ? (
            <View style={s.card}>
              <View style={s.empty}>
                <Text style={s.emptyIco}>🧩</Text>
                <Text style={s.emptyTxt}>Aucune dépense ce mois-ci</Text>
                <Text style={s.emptySub}>Ajoutez des dépenses pour voir la répartition</Text>
              </View>
            </View>
          ) : (
            <View style={s.card}>
              {/* Stacked horizontal bar */}
              <View style={s.stackedBar}>
                {repartition.map((cat, i) => (
                  <View key={i} style={[s.stackedSeg, { flex: cat.pourcentage || 1, backgroundColor: cat.couleur }]} />
                ))}
              </View>
              {/* Category list */}
              {repartition.map((cat, i) => (
                <View key={i} style={s.pieRow}>
                  <Text style={s.pieIco}>{cat.icone || '📦'}</Text>
                  <Text style={s.pieLabel} numberOfLines={1}>{cat.libelle}</Text>
                  <View style={s.pieBarWrap}>
                    <View style={[s.pieBar, { width: `${cat.pourcentage}%`, backgroundColor: cat.couleur }]} />
                  </View>
                  <Text style={s.piePct}>{cat.pourcentage}%</Text>
                  <Text style={s.pieAmount}>{fmt(cat.montant)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ─── Évolution mensuelle ─── */}
          <Text style={[s.sectionTitle, { marginTop: Spacing.lg }]}>Évolution (6 mois)</Text>
          {evolution.length === 0 ? (
            <View style={s.card}>
              <View style={s.empty}>
                <Text style={s.emptyIco}>📊</Text>
                <Text style={s.emptyTxt}>Aucune donnée disponible</Text>
                <Text style={s.emptySub}>Ajoutez des revenus et dépenses pour voir l'évolution</Text>
              </View>
            </View>
          ) : (
            <View style={s.card}>
              <View style={s.legend}>
                <View style={s.legendItem}><View style={[s.dot,{backgroundColor:C.green}]}/><Text style={s.legendTxt}>Revenus</Text></View>
                <View style={s.legendItem}><View style={[s.dot,{backgroundColor:C.danger}]}/><Text style={s.legendTxt}>Dépenses</Text></View>
              </View>
              <View style={[s.chart, { height: CHART_HEIGHT + 30 }]}>
                {evolution.map((e, i) => {
                  const revH = maxChartVal > 0 ? (e.revenus / maxChartVal) * CHART_HEIGHT : 0;
                  const depH = maxChartVal > 0 ? (e.depenses / maxChartVal) * CHART_HEIGHT : 0;
                  return (
                    <View key={i} style={s.barGroup}>
                      <Text style={s.barMonth}>{e.mois}</Text>
                      <Text style={s.barYear}>{e.annee !== now.getFullYear() ? e.annee : ''}</Text>
                      <View style={s.bars}>
                        <View style={[s.bar, { height: Math.max(revH, 2), backgroundColor: C.green }]} />
                        <View style={[s.bar, { height: Math.max(depH, 2), backgroundColor: C.danger }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── Objectif financier ─── */}
          {goals.filter((g:any)=>g.statut === 'en_cours' || !g.statut).length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 0 }]}>🎯 Objectif financier</Text>
              {goals.filter((g:any)=>g.statut === 'en_cours' || !g.statut).slice(0,1).map((goal:any,i:number)=>{
                const pct = goal.montant_cible > 0 ? Math.min((goal.montant_actuel / goal.montant_cible) * 100, 100) : 0;
                return (
                  <View key={i} style={s.card}>
                    <Text style={s.goalTitle}>{goal.titre}</Text>
                    <View style={s.goalAmountRow}>
                      <Text style={s.goalAmount}>{fmt(goal.montant_actuel)}</Text>
                      <Text style={s.goalSep}> / </Text>
                      <Text style={s.goalTarget}>{fmt(goal.montant_cible)} FCFA</Text>
                    </View>
                    <View style={s.goalBarWrap}>
                      <View style={[s.goalBar, { width: `${pct}%` }]} />
                    </View>
                    <Text style={s.goalPct}>{Math.round(pct)}%</Text>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}




