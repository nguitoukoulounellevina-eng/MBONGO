import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { useTheme } from '@/app/contexts/ThemeContext';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import api from '@/app/services/api';
import { getAnalyseRapport, setAnalyseRapport } from '@/app/services/analyseCache';
import { Spacing, Radius } from '@/constants/spacing';
import { fmt } from '@/app/utils/format';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACCENT = '#F59E0B';
const SECTION_COLORS = ['#7C3AED', '#EC4899', '#3B82F6', '#8B5CF6', '#F59E0B', '#33E1B7', '#22C55E', '#0F0B1F'];

interface Section {
  key: string;
  icone: string;
  titre: string;
  color: string;
  render: () => React.ReactNode;
}

export default function AnalyseFinanciere() {
  const { colors: C } = useTheme();
  const s = useMemo(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor:'#0D0828', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, position:'relative', overflow:'hidden' },
  headerRing1:{ position:'absolute', width:180, height:180, borderRadius:90, borderWidth:1, borderColor:'rgba(167,139,250,0.1)', top:-50, right:-30 },
  headerRing2:{ position:'absolute', width:100, height:100, borderRadius:50, borderWidth:1, borderColor:'rgba(167,139,250,0.06)', top:10, right:Spacing.sm },
  navRow: { flexDirection:'row', alignItems:'center' },
  roundBtn: { width:36, height:36, borderRadius:Radius.full, backgroundColor:'rgba(255,255,255,0.10)', alignItems:'center', justifyContent:'center' },
  headerCenter: { flex:1, alignItems:'center' },
  title: { fontSize:15, fontWeight:'700', color:'#FFF' },
  subtitle: { fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:1 },
  scroll: { padding: Spacing.lg },
  center: { flex:1, alignItems:'center', justifyContent:'center', padding: Spacing.xl },
  reportHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  rapportWrap: { marginBottom:Spacing.lg },
  rapportDate: { fontSize:11, fontWeight:'800', color:C.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:Spacing.md },
  refreshBadge: { flexDirection:'row', alignItems:'center', gap:Spacing.xs },
  refreshTxt: { fontSize:10, fontWeight:'600', color:ACCENT },
  sectionCard: { backgroundColor:C.white, borderRadius:Radius.lg, marginBottom:Spacing.md, borderWidth:1, borderColor:C.border, overflow:'hidden' },
  sectionHeader: { flexDirection:'row', alignItems:'center', padding:Spacing.lg },
  sectionIconWrap: { width:32, height:32, borderRadius:Radius.md, alignItems:'center', justifyContent:'center', marginRight:Spacing.md },
  sectionIcone: { fontSize:17 },
  sectionTitre: { flex:1, fontSize:14, fontWeight:'700', color:C.text },
  sectionBody: { paddingHorizontal:Spacing.lg, paddingBottom:Spacing.lg, borderTopWidth:1, borderTopColor:C.border, paddingTop:Spacing.md },
  subSectionTitle: { fontSize:12, fontWeight:'800', color:C.text, marginBottom:Spacing.sm },
  insightBlock: { marginBottom:Spacing.md },
  insightText: { fontSize:12, color:C.muted, lineHeight:17, marginBottom:4 },
  summaryGrid: { flexDirection:'row', flexWrap:'wrap', gap:Spacing.sm },
  summaryCard: { width:'47%', backgroundColor:C.surface, borderRadius:Radius.md, padding:Spacing.md, alignItems:'center' },
  summaryIco: { fontSize:19, marginBottom:Spacing.xs },
  summaryVal: { fontSize:14, fontWeight:'800' },
  summaryLbl: { fontSize:10, color:C.muted, marginTop:2, textAlign:'center' },
  periodGrid: { flexDirection:'row', gap:Spacing.sm, marginTop:Spacing.md },
  periodCard: { flex:1, backgroundColor:C.surface, borderRadius:Radius.md, padding:Spacing.sm, alignItems:'center' },
  periodIco: { fontSize:15, marginBottom:2 },
  periodAmt: { fontSize:12, fontWeight:'800', color:C.text },
  periodLbl: { fontSize:9, color:C.muted, marginTop:1 },
  catRow: { flexDirection:'row', alignItems:'center', marginBottom:Spacing.sm },
  catIco: { fontSize:15, marginRight:Spacing.sm, width:24 },
  catInfo: { flex:1 },
  catLabel: { fontSize:11, fontWeight:'600', color:C.text, marginBottom:3 },
  catBarWrap: { height:6, backgroundColor:C.surface, borderRadius:3, overflow:'hidden' },
  catBar: { height:6, borderRadius:3 },
  catPct: { fontSize:11, fontWeight:'700', color:C.text, width:30, textAlign:'right', marginLeft:Spacing.sm },
  catAmt: { fontSize:10, color:C.muted, width:55, textAlign:'right', marginLeft:Spacing.xs },
  unusualRow: { flexDirection:'row', alignItems:'flex-start', marginBottom:Spacing.sm },
  unusualIco: { fontSize:15, marginRight:Spacing.sm, marginTop:2 },
  unusualInfo: { flex:1 },
  unusualLabel: { fontSize:12, fontWeight:'700', color:C.text },
  unusualDesc: { fontSize:11, color:C.muted, marginTop:1 },
  overRow: { flexDirection:'row', alignItems:'flex-start', marginBottom:Spacing.sm },
  overIco: { fontSize:15, marginRight:Spacing.sm, marginTop:2 },
  overInfo: { flex:1 },
  overLabel: { fontSize:12, fontWeight:'700', color:C.danger },
  overDesc: { fontSize:11, color:C.muted, marginTop:1 },
  statRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:Spacing.sm },
  statLabel: { fontSize:12, color:C.muted, flex:1 },
  statVal: { fontSize:13, fontWeight:'700' },
  goalCard: { backgroundColor:C.surface, borderRadius:Radius.md, padding:Spacing.md, marginBottom:Spacing.sm },
  goalHeader: { flexDirection:'row', alignItems:'center', marginBottom:Spacing.sm },
  goalIco: { fontSize:17, marginRight:Spacing.sm },
  goalTitre: { fontSize:13, fontWeight:'700', color:C.text, flex:1 },
  goalBadge: { fontSize:10, fontWeight:'700', color:C.green },
  goalBarWrap: { height:6, backgroundColor:C.border, borderRadius:3, overflow:'hidden', marginBottom:Spacing.sm },
  goalBar: { height:6, borderRadius:3 },
  goalRow: { flexDirection:'row', alignItems:'baseline' },
  goalAmt: { fontSize:14, fontWeight:'800', color:C.blue },
  goalSep: { fontSize:12, color:C.muted, marginHorizontal:3 },
  goalTarget: { fontSize:12, fontWeight:'600', color:C.muted },
  goalPct: { fontSize:12, fontWeight:'700', marginLeft:'auto' },
  goalRest: { fontSize:11, color:C.muted, marginTop:3 },
  attCard: { borderRadius:Radius.md, padding:Spacing.md, borderWidth:1, marginBottom:Spacing.sm },
  attHeader: { flexDirection:'row', alignItems:'center', marginBottom:Spacing.xs },
  attIcone: { fontSize:17, marginRight:Spacing.sm },
  attTitre: { fontSize:13, fontWeight:'700', color:C.text, flex:1 },
  attMessage: { fontSize:12, color:C.text, lineHeight:16 },
  attBtn: { marginTop:Spacing.sm, alignSelf:'flex-start' },
  attBtnTxt: { fontSize:11, fontWeight:'700', color:ACCENT },
  recoCard: { backgroundColor:C.surface, borderRadius:Radius.md, padding:Spacing.md, marginBottom:Spacing.sm, borderWidth:1, borderColor:C.border },
  recoRow: { flexDirection:'row', alignItems:'flex-start' },
  recoIco: { fontSize:17, marginRight:Spacing.md, marginTop:2 },
  recoInfo: { flex:1 },
  recoTitre: { fontSize:13, fontWeight:'700', color:C.text, marginBottom:2 },
  recoDesc: { fontSize:11, color:C.muted, lineHeight:15 },
  recoBtn: { backgroundColor:ACCENT, borderRadius:Radius.md, paddingVertical:Spacing.xs, paddingHorizontal:Spacing.md, alignSelf:'flex-start', marginTop:Spacing.sm },
  recoBtnTxt: { fontSize:11, fontWeight:'700', color:C.white },
  scoreWrap: { alignItems:'center', paddingVertical:Spacing.md },
  scoreCircle: { width:80, height:80, borderRadius:40, backgroundColor:C.surface, alignItems:'center', justifyContent:'center', marginBottom:Spacing.md, borderWidth:3, borderColor:ACCENT },
  scoreVal: { fontSize:29, fontWeight:'800' },
  scoreMax: { fontSize:11, color:C.muted, fontWeight:'600' },
  scoreLabel: { fontSize:14, fontWeight:'700', marginBottom:Spacing.sm },
  scoreStars: { fontSize:21, letterSpacing:2, marginBottom:Spacing.lg, color: '#F59E0B' },
  baremeWrap: { flexDirection:'row', gap:Spacing.sm, flexWrap:'wrap', justifyContent:'center' },
  baremeItem: { borderRadius:Radius.md, paddingVertical:Spacing.xs, paddingHorizontal:Spacing.md, borderWidth:1, borderColor:C.border, alignItems:'center' },
  baremeRange: { fontSize:10, fontWeight:'700' },
  baremeLabel: { fontSize:9, fontWeight:'600', marginTop:1 },
  conclusionText: { fontSize:14, color:C.text, lineHeight:20, fontStyle:'italic' },
  emptySection: { fontSize:12, color:C.muted, textAlign:'center', paddingVertical:Spacing.md },
  emptyIco: { fontSize:49, marginBottom:Spacing.md },
  emptyTitle: { fontSize:17, fontWeight:'700', color:C.text, marginBottom:Spacing.sm },
  emptyTxt: { fontSize:13, color:C.hint, textAlign:'center', marginBottom:Spacing.lg },
  retryBtn: { backgroundColor:ACCENT, borderRadius:Radius.md, paddingVertical:Spacing.sm, paddingHorizontal:Spacing.lg },
  retryTxt: { fontSize:13, fontWeight:'700', color:C.white },
}), [C]);
  const insets = useSafeAreaInsets();
  const [rapport, setRapport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<ScrollView>(null);
  const cardEntry = useSharedValue(0);

  useEffect(() => {
    cardEntry.value = withSpring(1, { damping: 14, stiffness: 100 });
    const cached = getAnalyseRapport();
    if (cached) {
      setRapport(cached);
      setExpanded({ resume: true, analyse_depenses: true });
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const refreshAnalysis = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await api.analyseIa.analyserComplet();
      setAnalyseRapport(result.rapport);
      setRapport(result.rapport);
      setExpanded({ resume: true, analyse_depenses: true });
    } catch (e: any) {
      console.warn('refresh analysis error', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const toggleSection = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sections: Section[] = [];

  if (rapport) {
    sections.push({
      key: 'resume', icone: '📊', titre: 'Résumé général', color: SECTION_COLORS[0],
      render: () => {
        const rev = rapport.resume.revenus || 0;
        const dep = rapport.resume.depenses || 0;
        const solde = rapport.resume.solde ?? (rev - dep);
        const totalEpargne = Array.isArray(rapport.analyse_objectifs)
          ? rapport.analyse_objectifs.reduce((s: number, o: any) => s + (o.actuel || 0), 0)
          : 0;
        return (
        <>
        <View style={s.summaryGrid}>
          {[
            { lbl:'Revenus', val:fmt(rev), ico:'arrow-up', color:C.green },
            { lbl:'Dépenses', val:fmt(dep), ico:'arrow-down', color:C.danger },
            { lbl:'Solde', val:fmt(solde), ico:'🏦', color: solde >= 0 ? C.blue : C.danger },
            { lbl:"Épargne", val:fmt(totalEpargne), ico:'💰', color: totalEpargne > 0 ? C.green : C.muted },
          ].map((item: any, i: number) => (
            <View key={i} style={s.summaryCard}>
              <Ionicons name={item.ico} size={19} color={item.color} />
              <Text style={[s.summaryVal, { color: item.color }]}>{item.val}</Text>
              <Text style={s.summaryLbl}>{item.lbl}</Text>
            </View>
          ))}
        </View>
        <View style={s.periodGrid}>
          {[
            { lbl:"Aujourd'hui", val:fmt(rapport.resume.depenses_aujourdhui ?? 0), ico:'📅' },
            { lbl:"Cette semaine", val:fmt(rapport.resume.depenses_semaine ?? 0), ico:'📅' },
            { lbl:"Ce mois", val:fmt(dep), ico:'📅' },
          ].map((item, i) => (
            <View key={i} style={s.periodCard}>
              <Text style={s.periodIco}>{item.ico}</Text>
              <Text style={s.periodAmt}>{item.val}</Text>
              <Text style={s.periodLbl}>{item.lbl}</Text>
            </View>
          ))}
        </View>
        </>
      );
      },
    });

    sections.push({
      key: 'analyse_depenses', icone: '📈', titre: 'Analyse des dépenses', color: SECTION_COLORS[1],
      render: () => (
        <View>
          {rapport.analyse_depenses.top_categories.length > 0 && (
            <View style={s.insightBlock}>
              <Text style={s.subSectionTitle}>🏆 Top catégories</Text>
              {rapport.analyse_depenses.top_categories.map((cat: any, i: number) => {
                const maxPct = Math.max(...rapport.analyse_depenses.top_categories.map((c: any) => c.pourcentage));
                const pct = maxPct > 0 ? (cat.pourcentage / maxPct) * 100 : 0;
                return (
                  <View key={i} style={s.catRow}>
                    <Text style={s.catIco}>{cat.icone}</Text>
                    <View style={s.catInfo}>
                      <Text style={s.catLabel}>{cat.libelle}</Text>
                      <View style={s.catBarWrap}>
                        <View style={[s.catBar, { width: `${pct}%`, backgroundColor: cat.couleur || C.blue }]} />
                      </View>
                    </View>
                    <Text style={s.catPct}>{cat.pourcentage}%</Text>
                    <Text style={s.catAmt}>{fmt(cat.montant)}</Text>
                  </View>
                );
              })}
            </View>
          )}
          {rapport.analyse_depenses.depenses_inhabituelles.length > 0 && (
            <View style={s.insightBlock}>
              <Text style={s.subSectionTitle}>💡 Dépenses inhabituelles</Text>
              {rapport.analyse_depenses.depenses_inhabituelles.map((d: any, i: number) => (
                <View key={i} style={s.unusualRow}>
                  <Text style={s.unusualIco}>⚠️</Text>
                  <View style={s.unusualInfo}>
                    <Text style={s.unusualLabel}>{d.libelle}</Text>
                    <Text style={s.unusualDesc}>{fmt(d.montant)} (moyenne : {fmt(d.moyenne)})</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          {rapport.analyse_depenses.depassements_budget.length > 0 && (
            <View style={s.insightBlock}>
              <Text style={s.subSectionTitle}>🚨 Dépassements de budget</Text>
              {rapport.analyse_depenses.depassements_budget.map((d: any, i: number) => (
                <View key={i} style={s.overRow}>
                  <Text style={s.overIco}>{d.icone}</Text>
                  <View style={s.overInfo}>
                    <Text style={s.overLabel}>{d.categorie}</Text>
                    <Text style={s.overDesc}>Dépassement de {fmt(d.depassement)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          {rapport.analyse_depenses.insights.map((insight: string, i: number) => (
            <Text key={i} style={s.insightText}>{insight}</Text>
          ))}
        </View>
      ),
    });

    sections.push({
      key: 'analyse_revenus', icone: '💰', titre: 'Analyse des revenus', color: SECTION_COLORS[2],
      render: () => (
        <View>
          <View style={s.statRow}>
            <Text style={s.statLabel}>Total des revenus</Text>
            <Text style={s.statVal}>{fmt(rapport.analyse_revenus.total)}</Text>
          </View>
          <View style={s.statRow}>
            <Text style={s.statLabel}>Revenus stables</Text>
            <Text style={[s.statVal, rapport.analyse_revenus.stable ? { color: C.green } : { color: C.warning }]}>
              {rapport.analyse_revenus.stable ? '✅ Oui' : '⚠️ Non'}
            </Text>
          </View>
          {rapport.analyse_revenus.evolution !== 0 && (
            <View style={s.statRow}>
              <Text style={s.statLabel}>Évolution vs mois précédent</Text>
              <Text style={[s.statVal, rapport.analyse_revenus.evolution >= 0 ? { color: C.green } : { color: C.danger }]}>
                {rapport.analyse_revenus.evolution > 0 ? '+' : ''}{rapport.analyse_revenus.evolution}%
              </Text>
            </View>
          )}
          <View style={s.statRow}>
            <Text style={s.statLabel}>Revenus couvrent les dépenses</Text>
            <Text style={[s.statVal, rapport.analyse_revenus.couvre_depenses ? { color: C.green } : { color: C.danger }]}>
              {rapport.analyse_revenus.couvre_depenses ? '✅ Oui' : '❌ Non'}
            </Text>
          </View>
          {rapport.analyse_revenus.insights.map((insight: string, i: number) => (
            <Text key={i} style={s.insightText}>{insight}</Text>
          ))}
        </View>
      ),
    });

    sections.push({
      key: 'analyse_objectifs', icone: '🎯', titre: 'Analyse des objectifs', color: SECTION_COLORS[3],
      render: () => (
        <View>
          {rapport.analyse_objectifs.length === 0 ? (
            <Text style={s.emptySection}>Aucun objectif d'épargne défini.</Text>
          ) : (
            rapport.analyse_objectifs.map((o: any, i: number) => {
              const barColor = o.progression >= 100 ? C.green : o.progression > 70 ? C.warning : ACCENT;
              return (
                <View key={i} style={s.goalCard}>
                  <View style={s.goalHeader}>
                    <Text style={s.goalIco}>{o.icone}</Text>
                    <Text style={s.goalTitre}>{o.titre}</Text>
                    {o.statut === 'atteint' && <Text style={s.goalBadge}>✅ Atteint</Text>}
                  </View>
                  <View style={s.goalBarWrap}>
                    <View style={[s.goalBar, { width: `${Math.min(o.progression, 100)}%`, backgroundColor: barColor }]} />
                  </View>
                  <View style={s.goalRow}>
                    <Text style={s.goalAmt}>{fmt(o.actuel)}</Text>
                    <Text style={s.goalSep}>/</Text>
                    <Text style={s.goalTarget}>{fmt(o.cible)}</Text>
                    <Text style={[s.goalPct, { color: barColor }]}>{o.progression}%</Text>
                  </View>
                  {o.progression < 100 && (
                    <Text style={s.goalRest}>Reste {fmt(o.restant)}{o.temps_estime ? ` — ~${o.temps_estime}` : ''}</Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      ),
    });

    sections.push({
      key: 'points_attention', icone: '⚠️', titre: "Points d'attention", color: SECTION_COLORS[4],
      render: () => (
        <View>
          {rapport.points_attention.length === 0 ? (
            <Text style={s.emptySection}>Aucun point d'attention. ✅</Text>
          ) : (
            rapport.points_attention.map((p: any, i: number) => {
              const colors: Record<string, { bg: string; border: string }> = {
                danger: { bg:'#FEE2E2', border:'#FCA5A5' },
                warning: { bg:'#FEF3C7', border:'#FDE68A' },
                success: { bg:'#DCFCE7', border:'#BBF7D0' },
                info: { bg:'#DBEAFE', border:'#93C5FD' },
              };
              const palette = colors[p.type] || colors.info;
              return (
                <View key={i} style={[s.attCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                  <View style={s.attHeader}>
                    <Text style={s.attIcone}>{p.icone}</Text>
                    <Text style={s.attTitre}>{p.titre}</Text>
                  </View>
                  <Text style={s.attMessage}>{p.message}</Text>
                  {p.route && (
                    <TouchableOpacity style={s.attBtn} onPress={() => router.push(`/${p.route}` as any)}>
                      <View style={{flexDirection:'row', alignItems:'center'}}><Text style={s.attBtnTxt}>Voir </Text><Ionicons name="chevron-forward" size={12} color="#FFF" /></View>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      ),
    });

    sections.push({
      key: 'recommandations', icone: '💡', titre: 'Recommandations', color: SECTION_COLORS[5],
      render: () => (
        <View>
          {rapport.recommandations.length === 0 ? (
            <Text style={s.emptySection}>Aucune recommandation pour le moment.</Text>
          ) : (
            rapport.recommandations.map((r: any, i: number) => (
              <View key={i} style={s.recoCard}>
                <View style={s.recoRow}>
                  <Text style={s.recoIco}>{r.icone}</Text>
                  <View style={s.recoInfo}>
                    <Text style={s.recoTitre}>{r.titre}</Text>
                    <Text style={s.recoDesc}>{r.description}</Text>
                  </View>
                </View>
                {r.route && (
                  <TouchableOpacity style={s.recoBtn} onPress={() => router.push(`/${r.route}` as any)}>
                    <Text style={s.recoBtnTxt}>Appliquer</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      ),
    });

    sections.push({
      key: 'score', icone: '⭐', titre: 'Score de santé financière', color: SECTION_COLORS[6],
      render: () => {
        const sc = rapport.score;
        const stars = '★'.repeat(sc.etoiles) + '☆'.repeat(5 - sc.etoiles);
        const niveaux: Record<string, string> = { excellent:'#22D3A5', bon:'#3B82F6', moyen:'#F59E0B', a_ameliorer:'#FF4D6A' };
        const color = niveaux[sc.niveau] || C.muted;
        return (
          <View style={s.scoreWrap}>
            <View style={s.scoreCircle}>
              <Text style={[s.scoreVal, { color }]}>{sc.valeur}</Text>
              <Text style={s.scoreMax}>/100</Text>
            </View>
            <Text style={[s.scoreLabel, { color }]}>{sc.interpretation}</Text>
            <Text style={s.scoreStars}>{stars}</Text>
            <View style={s.baremeWrap}>
              {Object.entries(sc.bareme).map(([key, range]: any) => {
                const isActive = key === sc.niveau;
                const c = niveaux[key] || C.muted;
                return (
                  <View key={key} style={[s.baremeItem, isActive && { backgroundColor: c + '20', borderColor: c }]}>
                    <Text style={[s.baremeRange, { color: c }]}>{range}</Text>
                    <Text style={[s.baremeLabel, { color: isActive ? c : C.muted }]}>
                      {key === 'a_ameliorer' ? 'À améliorer' : key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      },
    });

    sections.push({
      key: 'conclusion', icone: '📝', titre: 'Conclusion', color: SECTION_COLORS[7],
      render: () => <Text style={s.conclusionText}>{rapport.conclusion}</Text>,
    });
  }

  const cardAnim = useAnimatedStyle(() => ({
    opacity: cardEntry.value,
    transform: [{ translateY: (1 - cardEntry.value) * 30 }],
  }));

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        <View style={s.headerRing1} />
        <View style={s.headerRing2} />
        <View style={s.navRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.roundBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back-outline" size={20} color={C.white} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.title}>📊 Rapport d'analyse</Text>
            <Text style={s.subtitle}>Analyse financière complète</Text>
          </View>
          <TouchableOpacity onPress={refreshAnalysis} style={s.roundBtn} activeOpacity={0.7} disabled={refreshing}>
            <Ionicons name={refreshing ? 'sync' : 'refresh'} size={20} color={C.white} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      ) : !rapport ? (
        <View style={s.center}>
          <Text style={s.emptyIco}>📊</Text>
          <Text style={s.emptyTitle}>Aucune analyse disponible</Text>
          <Text style={s.emptyTxt}>Lancez une analyse depuis la page Motéma.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => router.back()}>
            <Text style={s.retryTxt}>Retour à Motéma</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={[s.rapportWrap, cardAnim]}>
            <View style={s.reportHeader}>
              <Text style={s.rapportDate}>Analyse du {rapport.resume.periode}</Text>
              {refreshing && (
                <View style={s.refreshBadge}>
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text style={s.refreshTxt}>Actualisation...</Text>
                </View>
              )}
            </View>
            {sections.map((sec) => {
              const isExpanded = expanded[sec.key] ?? false;
              return (
                <View key={sec.key} style={s.sectionCard}>
                  <TouchableOpacity style={s.sectionHeader} onPress={() => toggleSection(sec.key)} activeOpacity={0.7}>
                    <View style={[s.sectionIconWrap, { backgroundColor: sec.color + '18' }]}>
                      <Text style={s.sectionIcone}>{sec.icone}</Text>
                    </View>
                    <Text style={s.sectionTitre}>{sec.titre}</Text>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.muted} />
                  </TouchableOpacity>
                  {isExpanded && <View style={s.sectionBody}>{sec.render()}</View>}
                </View>
              );
            })}
          </Animated.View>
          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}




