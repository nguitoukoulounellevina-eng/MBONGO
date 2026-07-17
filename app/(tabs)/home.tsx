import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import api, { getUser, getToken, API_BASE, getOnboardingDone, getGuidedTourDone, setGuidedTourDone } from '@/app/services/api';
import GuidedTour from '@/app/components/onboarding/GuidedTour';
import { Image } from 'expo-image';
import { comptesCache, revenusCache, depensesCache, budgetsCache } from '@/app/services/cache';
import { Spacing, Radius } from '@/constants/spacing';
import { fmt, dotSep } from '@/app/utils/format';
import { useNotifications } from '@/app/services/NotificationContext';
import { useTheme } from '@/app/contexts/ThemeContext';
import { ScreenWrapper } from '@/app/components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import TrendAlertBanner from '@/app/components/TrendAlertBanner';

const now = new Date();

const QUICK_ACTIONS = [
  { ico:'🏦', label:'Comptes',      color:'#ECFDF5', route:'comptes' },
  { ico:'🎯', label:'Objectifs',    color:'#DBEAFE', route:'objectifs_epargne' },
  { ico:'🏷️', label:'Catégories',   color:'#FCE7F3', route:'categorie' },
  { ico:'📊', label:'Budget', color:'#FEF3C7', route:'budget' },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { unreadCount, trendAlerts } = useNotifications();
  const { colors: C, isDark } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [user, setUser] = useState<any>(null);
  const [comptes, setComptes] = useState<any[]>(comptesCache.data ?? []);
  const [revenusList, setRevenusList] = useState<any[]>(revenusCache.data ?? []);
  const [depensesList, setDepensesList] = useState<any[]>(depensesCache.data ?? []);
  const [budgets, setBudgets] = useState<any[]>(budgetsCache.data ?? []);
  const [loading, setLoading] = useState(true);

  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [sectionY, setSectionY] = useState<Record<string, number>>({});
  const tourCheckDone = useRef(false);

  const TOUR_STEPS = [
    { id: 'transactions', icon: '💰', title: 'Ajoutez vos revenus et dépenses', description: 'Commencez par ajouter vos premiers revenus (salaire, missions...) puis vos dépenses du quotidien. Allez dans Transactions depuis la barre en bas pour commencer.' },
    { id: 'budget', icon: '📊', title: 'Créez un budget', description: 'Fixez des limites par catégorie : alimentation, transport, loisirs. Cela vous évite les mauvaises surprises en fin de mois. Allez dans Actions rapides > Budget.' },
    { id: 'objectifs', icon: '🎯', title: 'Définissez vos objectifs', description: 'Épargnez pour un projet ! Même un petit montant chaque mois suffit. Allez dans Actions rapides > Objectifs pour commencer.' },
    { id: 'motema', icon: '🤖', title: 'Parlez à Motéma', description: 'Posez toutes vos questions sur vos finances. Je suis là pour vous conseiller et vous guider au quotidien.', route: '/(tabs)/ia' },
  ];

  const captureY = (id: string) => (e: any) => {
    const y = e.nativeEvent.layout.y;
    if (!sectionY[id]) {
      setSectionY(prev => ({ ...prev, [id]: y }));
    }
  };

  const scrollToSection = (id: string) => {
    const y = sectionY[id];
    if (y !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: y - 80, animated: true });
    }
  };

  const nextTourStep = () => {
    const next = tourStep + 1;
    if (next < TOUR_STEPS.length) {
      setTourStep(next);
      scrollToSection(TOUR_STEPS[next].id);
    }
  };

  const goToStep = (route: string) => {
    setShowTour(false);
    setTourStep(0);
    setGuidedTourDone();
    router.push(route as any);
  };

  const skipTour = () => {
    setShowTour(false);
    setTourStep(0);
    setGuidedTourDone();
  };

  const completeTour = () => {
    setShowTour(false);
    setTourStep(0);
    setGuidedTourDone();
  };

  const loadData = useCallback(async () => {
    try {
      const [c, r, d, b] = await Promise.all([
        api.comptes.list(),
        api.revenus.list(),
        api.depenses.list(),
        api.budgets.list(),
      ]);
      const cList = Array.isArray(c) ? c : [];
      const rList = Array.isArray(r) ? r : [];
      const dList = Array.isArray(d) ? d : [];
      const bList = Array.isArray(b) ? b : [];
      comptesCache.data = cList; comptesCache.loaded = true;
      revenusCache.data = rList; revenusCache.loaded = true;
      depensesCache.data = dList; depensesCache.loaded = true;
      budgetsCache.data = bList; budgetsCache.loaded = true;
      setComptes(cList); setRevenusList(rList);
      setDepensesList(dList); setBudgets(bList);
    } catch (err) {
      console.warn('load home data', err);
      if (comptesCache.data) setComptes(comptesCache.data);
      if (revenusCache.data) setRevenusList(revenusCache.data);
      if (depensesCache.data) setDepensesList(depensesCache.data);
      if (budgetsCache.data) setBudgets(budgetsCache.data);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    const u = getUser();
    if (!u || !getToken()) {
      router.replace('/(tabs)');
      return;
    }
    setUser(u);
    loadData();
  }, [loadData]));

  useEffect(() => {
    if (tourCheckDone.current) return;
    tourCheckDone.current = true;
    (async () => {
      const [onboardingOk, tourOk] = await Promise.all([getOnboardingDone(), getGuidedTourDone()]);
      if (!tourOk && onboardingOk) {
        setShowTour(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (showTour && sectionY[TOUR_STEPS[0].id]) {
      scrollToSection(TOUR_STEPS[0].id);
    }
  }, [showTour, sectionY]);

  const styles = useMemo(() => StyleSheet.create({
    root:{ flex:1, backgroundColor:C.bg },
    header:{ backgroundColor: isDark ? C.bg : C.dark, paddingHorizontal:Spacing.lg, paddingBottom:Spacing.xl, position:'relative', overflow:'hidden' },
    ring1:{ position:'absolute', width:200, height:200, borderRadius:100, borderWidth:1, borderColor:'rgba(167,139,250,0.12)', top:-60, right:-40 },
    ring2:{ position:'absolute', width:120, height:120, borderRadius:60, borderWidth:1, borderColor:'rgba(167,139,250,0.08)', top:Spacing.md, right:Spacing.md },
    headerTop:{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:Spacing.lg },
    headerTextBlock:{ flex:1, marginRight:Spacing.md },
    headerGreet:{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:Spacing.xs },
    headerName:{ fontSize:25, fontWeight:'900', color: isDark ? C.text : C.white, letterSpacing:-0.5, lineHeight:30 },
    headerDate:{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:6 },
    avatarWrap:{ width:48, height:48, borderRadius:Radius.xl, backgroundColor:C.purple, alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:'rgba(167,139,250,0.4)', position:'relative', marginTop:Spacing.xs },
    avatarImage:{ width:48, height:48, borderRadius:Radius.xl, borderWidth:2, borderColor:'rgba(167,139,250,0.4)' },
    avatarTxt:{ fontSize:17, fontWeight:'800', color:C.white },
    avatarOnline:{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:5, backgroundColor:C.green, borderWidth:1.5, borderColor: isDark ? C.bg : C.dark },
    notifBadge:{ position:'absolute', top:-4, right:-8, backgroundColor:'#EF4444', borderRadius:10, minWidth:18, height:18, alignItems:'center', justifyContent:'center', paddingHorizontal:4 },
    notifBadgeTxt:{ color:'#fff', fontSize:12, fontWeight:'bold' },
    body:{ padding:Spacing.lg },

    soldeCard:{ backgroundColor: isDark ? C.bg : C.dark, borderRadius:Radius.lg, padding:Spacing.lg, marginBottom:Spacing.md, borderWidth:1, borderColor:'rgba(255,255,255,0.1)' },
    soldeLbl:{ fontSize:11, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:0.6, marginBottom:Spacing.xs },
    soldeVal:{ fontSize:31, fontWeight:'800', color: isDark ? C.text : C.white, letterSpacing:-0.5, marginBottom:Spacing.xs },
    soldeCurrency:{ fontSize:13, fontWeight:'600', color:'rgba(255,255,255,0.5)', marginBottom:Spacing.lg },
    soldeRow:{ flexDirection:'row', alignItems:'center' },
    soldeSub:{ flex:1, flexDirection:'row', alignItems:'center', gap:Spacing.sm },
    soldeSubIco:{ fontSize:19, color:C.green, fontWeight:'700' },
    soldeSubLbl:{ fontSize:10, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:0.4 },
    soldeSubVal:{ fontSize:13, fontWeight:'700', color: isDark ? C.text : C.white, marginTop:1 },
    soldeDivider:{ width:1, height:30, backgroundColor:'rgba(255,255,255,0.1)', marginHorizontal:Spacing.md },

    budgetWrap:{ backgroundColor: isDark ? C.bg : C.dark, borderRadius:Radius.lg, padding:Spacing.md, marginBottom:Spacing.md, borderWidth:1, borderColor:'rgba(255,255,255,0.1)' },
    budgetLabelRow:{ flexDirection:'row', justifyContent:'space-between', marginBottom:Spacing.sm },
    budgetLbl:{ fontSize:11, color:'rgba(255,255,255,0.5)' },
    budgetPct:{ fontSize:11, fontWeight:'700', color: isDark ? C.text : C.white },
    budgetBar:{ height:6, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:3, overflow:'hidden' },
    budgetFill:{ height:6, borderRadius:3 },
    budgetDetail:{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:Spacing.xs, marginBottom:Spacing.xs },
    budgetAlert:{ fontSize:10, color:C.danger, marginTop:Spacing.xs, fontWeight:'600' },

    conseilCard:{ backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.lg, marginBottom:Spacing.lg, borderWidth:1, borderColor:C.border, shadowColor:C.dark, shadowOffset:{width:0,height:3}, shadowOpacity:0.04, shadowRadius:Spacing.sm, elevation:2 },
    conseilRow:{ flexDirection:'row', gap:Spacing.md, marginBottom:Spacing.md },
    conseilIconWrap:{ width:44, height:44, borderRadius:Radius.md, backgroundColor:'#F5F3FF', alignItems:'center', justifyContent:'center' },
    conseilIcon:{ fontSize:22 },
    conseilContent:{ flex:1 },
    conseilTitle:{ fontSize:14, fontWeight:'800', color:C.dark, marginBottom:Spacing.xs },
    conseilText:{ fontSize:12, color:C.muted, lineHeight:17 },
    conseilCta:{ flexDirection:'row', alignItems:'center', justifyContent:'flex-end', gap:Spacing.xs },
    conseilCtaTxt:{ fontSize:12, fontWeight:'700', color:C.purple },
    conseilCtaArrow:{ fontSize:14, fontWeight:'800', color:C.purple },

    sectionRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:Spacing.md },
    sectionTitle:{ fontSize:11, fontWeight:'800', color:C.dark, textTransform:'uppercase', letterSpacing:0.8 },
    seeAllTxt:{ fontSize:11, fontWeight:'700', color:C.purple },

    quickGrid:{ flexDirection:'row', flexWrap:'wrap', gap:Spacing.md, marginBottom:Spacing.lg },
    quickCard:{ width:'47%', backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.md, borderWidth:1, borderColor:C.border, shadowColor:C.dark, shadowOffset:{width:0,height:3}, shadowOpacity:0.04, shadowRadius:Spacing.sm, elevation:2 },
    quickIcoWrap:{ width:38, height:38, borderRadius:Radius.md, alignItems:'center', justifyContent:'center', marginBottom:Spacing.sm },
    quickIco:{ fontSize:19 },
    quickLbl:{ fontSize:13, fontWeight:'700', color:C.dark },

    emptyTx:{ alignItems:'center', paddingVertical:Spacing.xl, backgroundColor:C.white, borderRadius:Radius.md, borderWidth:1, borderColor:C.border, marginBottom:Spacing.lg },
    emptyTxTxt:{ fontSize:13, color:C.muted, fontWeight:'600' },
    txItem:{ flexDirection:'row', alignItems:'center', gap:Spacing.md, backgroundColor:C.white, borderRadius:Radius.md, padding:Spacing.md, borderWidth:1, borderColor:C.border, marginBottom:Spacing.sm },
    txDot:{ width:32, height:32, borderRadius:Radius.sm, alignItems:'center', justifyContent:'center' },
    txArrow:{ fontSize:14, fontWeight:'800' },
    txInfo:{ flex:1 },
    txLbl:{ fontSize:13, fontWeight:'700', color:C.dark },
    txDate:{ fontSize:10, color:C.muted, marginTop:1 },
    txMt:{ fontSize:14, fontWeight:'800' },

    bannerCard:{ flexDirection:'row', alignItems:'center', gap:Spacing.md, backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.lg, borderWidth:1, borderColor:C.border, shadowColor:C.dark, shadowOffset:{width:0,height:3}, shadowOpacity:0.04, shadowRadius:Spacing.sm, elevation:2, marginBottom:Spacing.lg },
    bannerIcon:{ fontSize:28 },
    bannerContent:{ flex:1 },
    bannerTitle:{ fontSize:13, fontWeight:'800', color:C.dark, marginBottom:2 },
    bannerDesc:{ fontSize:11, color:C.muted, lineHeight:15 },
    bannerBtn:{ backgroundColor:C.purple, borderRadius:Radius.sm, paddingVertical:Spacing.sm, paddingHorizontal:Spacing.md },
    bannerBtnTxt:{ fontSize:11, fontWeight:'700', color:C.white },
  }), [C, isDark]);

  const days = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const dateStr = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  const solde = comptes.reduce((a: number, c: any) => a + (parseFloat(c.solde_actuel || 0) || 0), 0);
  const totalRevenus = revenusList
    .reduce((a: number, r: any) => a + Number(r.montant||r.mt||0), 0);
  const totalDepenses = depensesList
    .reduce((a: number, r: any) => a + Number(r.montant||r.mt||0), 0);
  const monthBudgets = budgets;
  const budgetTotal = monthBudgets.reduce((a: number, b: any) => a + parseFloat(b.montant_prevu||0), 0);
  const depensesBudget = monthBudgets.reduce((a: number, b: any) => a + parseFloat(b.montant_depense||0), 0);
  const reserveTotal = monthBudgets.reduce((a: number, b: any) => a + parseFloat(b.montant_reserve||0), 0);
  const budgetPct = budgetTotal > 0 ? Math.min(100, Math.round(((depensesBudget + reserveTotal) / budgetTotal) * 100)) : 0;
  const photoUrl = user?.photo ? `${API_BASE.replace('/api', '')}${user.photo}` : null;

  const allTransactions = [
    ...depensesList.map((d: any) => ({
      id: d.id,
      libelle: d.libelle || d.categorie_libelle || 'Dépense',
      montant: -(d.montant || d.mt || 0),
      date: d.date || d.created_at,
      type: 'depense' as const,
    })),
    ...revenusList.map((r: any) => ({
      id: r.id,
      libelle: r.libelle || r.categorie_libelle || 'Revenu',
      montant: r.montant || r.mt || 0,
      date: r.date || r.created_at,
      type: 'revenu' as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ScreenWrapper style={styles.root}>
      <StatusBar style="light" />

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {/* ── 1. Header ─────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 22 }]}>
          <View style={styles.ring1}/><View style={styles.ring2}/>

          <View style={styles.headerTop}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerGreet}>Bienvenue 👋</Text>
              <Text style={styles.headerName}>{user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}</Text>
              <Text style={styles.headerDate}>{dateStr}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => router.push('/notifications')}
                style={{ position: 'relative', marginTop: 6 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 23 }}>🔔</Text>
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeTxt}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={()=>router.push('/profile')}
                activeOpacity={0.8}
              >
                {photoUrl ? (
                  <Image source={photoUrl} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarTxt}>{user ? `${(user.prenom||'')[0]||''}${(user.nom||'')[0]||''}` : 'U'}</Text>
                )}
                <View style={styles.avatarOnline}/>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Corps ──────────────────────────── */}
        <View style={styles.body}>

          {/* 1.5 Trend Alert Banner */}
          {trendAlerts.length > 0 && (
            <TrendAlertBanner
              alertes={trendAlerts}
              colors={C}
              onPress={() => router.push('/(tabs)/ia')}
              onDismiss={() => {}}
            />
          )}

          {/* 2. Solde financier */}
          <View style={styles.soldeCard}>
            <Text style={styles.soldeLbl}>Votre argent</Text>
            <Text style={[styles.soldeVal, solde < 0 && { color: C.danger }]}>{dotSep(Math.round(solde || 0))}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.soldeCurrency}>FCFA</Text>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
                          {months[now.getMonth()]} {now.getFullYear()}
                        </Text>
                      </View>
                    </View>
            <View style={styles.soldeRow}>
              <View style={styles.soldeSub}>
                <Ionicons name="arrow-up" size={19} color={C.green} />
                <View>
                  <Text style={styles.soldeSubLbl}>Revenus</Text>
                  <Text style={styles.soldeSubVal}>{fmt(totalRevenus)}</Text>
                </View>
              </View>
              <View style={styles.soldeDivider}/>
              <View style={styles.soldeSub}>
                <Ionicons name="arrow-down" size={19} color={C.danger} />
                <View>
                  <Text style={styles.soldeSubLbl}>Dépenses</Text>
                  <Text style={[styles.soldeSubVal,{color:C.danger}]}>{fmt(totalDepenses)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3. Budget utilisé */}
          <View style={styles.budgetWrap} onLayout={captureY('budget')}>
            <View style={styles.budgetLabelRow}>
              <Text style={styles.budgetLbl}>Budget utilisé ce mois</Text>
              <Text style={styles.budgetPct}>{budgetPct}%</Text>
            </View>
            <View style={styles.budgetBar}>
              <LinearGradient
                colors={['#7C3AED', '#8B5CF6', '#33E1B7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.budgetFill, { width: `${budgetPct}%` }]}
              />
            </View>
            <Text style={styles.budgetDetail}>{fmt(depensesBudget)} / {fmt(budgetTotal)} FCFA</Text>
            {budgetPct >= 100 ? (
              <Text style={[styles.budgetAlert, { color: C.danger }]}>⛔ Budget totalement utilisé</Text>
            ) : budgetPct > 80 ? (
              <Text style={styles.budgetAlert}>⚠️ Attention : budget presque atteint</Text>
            ) : null}
          </View>

          {/* 4. Conseil MBONGO */}
          <TouchableOpacity style={styles.conseilCard} onLayout={captureY('motema')} onPress={() => router.push('/ia')} activeOpacity={0.85}>
            <View style={styles.conseilRow}>
              <View style={styles.conseilIconWrap}>
                <Text style={styles.conseilIcon}>🤖</Text>
              </View>
              <View style={styles.conseilContent}>
                <Text style={styles.conseilTitle}>Conseil Motéma</Text>
                <Text style={styles.conseilText}>
                  Utilisez l'IA MBONGO pour analyser vos dépenses, mieux gérer votre budget et développer votre épargne.
                </Text>
              </View>
            </View>
            <View style={styles.conseilCta}>
              <Text style={styles.conseilCtaTxt}>Parler à Motéma</Text>
              <Ionicons name="chevron-forward" size={14} color={C.purple} />
            </View>
          </TouchableOpacity>

          {/* 5. Actions rapides */}
          <View style={styles.sectionRow} onLayout={captureY('actions')}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            <TouchableOpacity onPress={() => router.push('/plus')} activeOpacity={0.7} style={{flexDirection:'row', alignItems:'center'}}>
              <Text style={styles.seeAllTxt}>Voir tout </Text>
              <Ionicons name="chevron-forward" size={11} color={C.purple} />
            </TouchableOpacity>
          </View>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((m, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickCard}
                onPress={() => router.push(`/${m.route}` as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIcoWrap, { backgroundColor: m.color }]}>
                  <Text style={styles.quickIco}>{m.ico}</Text>
                </View>
                <Text style={styles.quickLbl}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 6. Dernières transactions */}
          <View style={styles.sectionRow} onLayout={captureY('transactions')}>
            <Text style={styles.sectionTitle}>Dernières transactions</Text>
            <TouchableOpacity onPress={() => router.push('/transactions')} activeOpacity={0.7} style={{flexDirection:'row', alignItems:'center'}}>
              <Text style={styles.seeAllTxt}>Voir tout </Text>
              <Ionicons name="chevron-forward" size={11} color={C.purple} />
            </TouchableOpacity>
          </View>
          {allTransactions.length === 0 ? (
            <View style={styles.emptyTx}>
              <Text style={styles.emptyTxTxt}>Aucune transaction récente</Text>
            </View>
          ) : (
            allTransactions.map((tx, i) => (
              <View key={`${tx.type}-${tx.id}-${i}`} style={styles.txItem}>
                <View style={[styles.txDot, { backgroundColor: tx.type === 'depense' ? 'rgba(244,63,94,0.15)' : 'rgba(34,197,94,0.15)' }]}>
                  <Ionicons name={tx.type === 'depense' ? 'arrow-down' : 'arrow-up'} size={14} color={tx.type === 'depense' ? C.danger : C.green} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txLbl} numberOfLines={1}>{tx.libelle}</Text>
                  <Text style={styles.txDate}>{tx.date ? new Date(tx.date).toLocaleDateString('fr-FR') : ''}</Text>
                </View>
                <Text style={[styles.txMt, { color: tx.type === 'depense' ? C.danger : C.green }]}>
                  {tx.type === 'depense' ? '-' : '+'}{fmt(Math.abs(tx.montant))}
                </Text>
              </View>
            ))
          )}

          {/* 7. Bannière */}
          <View style={styles.bannerCard}>
            <Text style={styles.bannerIcon}>🎁</Text>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Parrainez vos proches</Text>
              <Text style={styles.bannerDesc}>
                Invitez vos amis à rejoindre MBONGO et profitez d'avantages exclusifs.
              </Text>
            </View>
            <TouchableOpacity style={styles.bannerBtn} activeOpacity={0.8}>
              <Text style={styles.bannerBtnTxt}>Je parraine</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
      <GuidedTour
        visible={showTour}
        current={tourStep}
        steps={TOUR_STEPS}
        onNext={nextTourStep}
        onSkip={skipTour}
        onComplete={completeTour}
        onAction={goToStep}
      />
    </ScreenWrapper>
  );
}

