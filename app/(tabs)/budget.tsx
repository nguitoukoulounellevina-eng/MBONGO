import { PageHeader } from '@/app/components/PageHeader';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/app/contexts/ThemeContext';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import api, { notify } from '@/app/services/api';
import { comptesCache, budgetsCache } from '@/app/services/cache';
import { Spacing, Radius } from '@/constants/spacing';
import { fmt, dotSep } from '@/app/utils/format';
import { Ionicons } from '@expo/vector-icons';
import PeriodSelector from '@/app/components/PeriodSelector';
import { usePeriod } from '@/app/services/periodService';
import { ScreenWrapper, FAB_BOTTOM } from '@/app/components/ScreenWrapper';
import { useToast } from '@/app/services/ToastContext';

const iconMap: Record<string, string> = {
  '📦':'cube-outline','🛒':'cart-outline','🏠':'home-outline','🚗':'car-outline',
  '🍽️':'restaurant-outline','⚡':'flash-outline','💡':'bulb-outline','📱':'phone-portrait-outline',
  '💻':'laptop-outline','👕':'shirt-outline','💊':'medkit-outline','🎓':'school-outline',
  '✈️':'airplane-outline','🎮':'game-controller-outline','🎬':'film-outline','📚':'book-outline',
  '🐾':'paw-outline','🌿':'leaf-outline','💼':'briefcase-outline','🎵':'musical-notes-outline',
  '🎁':'gift-outline','🔧':'wrench-outline','💎':'diamond-outline','☕':'cafe-outline',
  '🎯':'bullseye-outline','📊':'bar-chart-outline','🍕':'pizza-outline','🍺':'beer-outline',
  '🏋️':'fitness-outline','💳':'card-outline','🏦':'business-outline','💰':'wallet-outline',
  '📈':'trending-up-outline',
};
const toIcon = (emoji?: string) => iconMap[emoji||''] || 'cube-outline';

const ACCENT = '#F59E0B';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export default function Budget() {
  const { colors: C, isDark } = useTheme();
  const showToast = useToast();
  const s = useMemo(() => StyleSheet.create({
  root:{ flex:1, backgroundColor:C.bg },
  scroll:{ flexGrow:1 },

  menuBtn:{ width:36, height:36, alignItems:'center', justifyContent:'center' },
  menuDots:{ fontSize:23, color:C.white, lineHeight:24 },
  monthRow:{ flexDirection:'row', justifyContent:'center', paddingTop:4 },
  monthSelector:{ flexDirection:'row', alignItems:'center', alignSelf:'center', backgroundColor:'rgba(255,255,255,0.1)', borderRadius:20, height:44, paddingHorizontal:Spacing.lg, borderWidth:1, borderColor:'rgba(255,255,255,0.15)', gap:Spacing.sm, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.1, shadowRadius:4, elevation:2 },
  monthText:{ fontSize:15, fontWeight:'600', color:C.white },
  monthArrow:{ fontSize:10, color:'rgba(255,255,255,0.5)' },
  monthPickerOverlay:{ position:'absolute', top:0, left:0, right:0, bottom:0, justifyContent:'center', alignItems:'center', zIndex:100 },
  monthPickerCard:{ backgroundColor:C.white, borderRadius:Radius.xl, padding:Spacing.sm, width:280, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.15, shadowRadius:Spacing.xl, elevation:16 },
  monthPickerItem:{ flexDirection:'row', alignItems:'center', paddingVertical:Spacing.md, paddingHorizontal:Spacing.lg, borderRadius:Radius.md, marginBottom:2 },
  monthPickerItemActive:{ backgroundColor:C.surface },
  monthPickerItemText:{ flex:1, fontSize:15, fontWeight:'600', color:C.text },
  monthPickerItemTextActive:{ fontWeight:'700', color:ACCENT },
  monthPickerCheck:{ fontSize:15, fontWeight:'700', color:ACCENT },

  /* ── Action Sheet ────────────── */
  overlayActions:{ flex:1, justifyContent:'flex-end', padding:Spacing.lg },
  actionSheet:{ backgroundColor:C.white, borderRadius:Radius.xl, padding:Spacing.xl, paddingBottom:28, shadowColor:'#000', shadowOffset:{width:0,height:-4}, shadowOpacity:0.1, shadowRadius:Spacing.xl, elevation:10 },
  actionBtn:{ flexDirection:'row', alignItems:'center', gap:Spacing.md, paddingVertical:Spacing.md },
  actionBtnTxt:{ fontSize:15, fontWeight:'700', color:C.text },
  actionDivider:{ height:1, backgroundColor:C.border, marginVertical:Spacing.sm },
  copyTitle:{ fontSize:16, fontWeight:'700', color:C.text, marginBottom:Spacing.xs },
  copySub:{ fontSize:13, color:C.muted, lineHeight:18, marginBottom:Spacing.sm },
  loadingWrap:{ alignItems:'center', paddingVertical:60 },
  body:{ padding:Spacing.md },

  sectionTitle:{ fontSize:11, fontWeight:'800', color:C.text, textTransform:'uppercase', letterSpacing:0.8 },
  sectionTitleRow:{ flexDirection:'row', alignItems:'center', marginBottom:Spacing.sm, marginTop:Spacing.xs },

  /* ── Summary Card (compact) ──── */
  summaryCard:{ backgroundColor: isDark ? C.bg : C.dark, borderRadius:20, padding:Spacing.sm, marginBottom:Spacing.md, shadowColor:C.dark, shadowOffset:{width:0,height:4}, shadowOpacity:0.25, shadowRadius:Spacing.sm, elevation:6 },
  summaryLabel:{ fontSize:10, fontWeight:'700', color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 },
  summaryAmount:{ fontSize:25, fontWeight:'900', color:'#FFFFFF', letterSpacing:-0.5, marginBottom:Spacing.xs },
  summaryBarRow:{ flexDirection:'row', alignItems:'center', marginBottom:2 },
  summaryBarOuter:{ flex:1, height:4, backgroundColor:'rgba(255,255,255,0.2)', borderRadius:2, overflow:'hidden', marginRight:Spacing.sm },
  summaryBarInner:{ height:4, borderRadius:2 },
  summaryPct:{ fontSize:10, fontWeight:'800', color:'rgba(255,255,255,0.7)', width:28, textAlign:'right' },
  summaryProgress:{ fontSize:9, color:'rgba(255,255,255,0.5)', marginBottom:1 },
  summaryMeta:{ fontSize:9, color:'rgba(255,255,255,0.5)', marginBottom:Spacing.xs },
  summaryFooter:{ flexDirection:'row', alignItems:'center', paddingTop:Spacing.xs, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.12)' },
  summaryFooterItem:{ flex:1, alignItems:'center' },
  summaryFooterVal:{ fontSize:11, fontWeight:'800', color:'rgba(255,255,255,0.9)' },
  summaryFooterLbl:{ fontSize:8, fontWeight:'600', color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:0.3 },
  summaryFooterLblRow:{ flexDirection:'row', alignItems:'center' },
  summaryFooterDivider:{ width:1, height:16, backgroundColor:'rgba(255,255,255,0.12)' },
  disponibleRow:{ flexDirection:'row', alignItems:'center', gap:2 },

  /* ── Comptes utilisés ─────────── */
  compteUtiliseRow:{ flexDirection:'row', alignItems:'center', backgroundColor:C.white, borderRadius:Radius.md, padding:Spacing.xs, marginBottom:Spacing.xs, borderWidth:1, borderColor:C.border },
  compteUtiliseNom:{ flex:1, fontSize:12, fontWeight:'600', color:C.text, marginLeft:Spacing.xs },
  compteUtiliseMt:{ fontSize:12, fontWeight:'800', color:C.dark },

  /* ── Category Card (compact) ──── */
  catCard:{ backgroundColor:C.white, borderRadius:Radius.md, paddingVertical:Spacing.sm, paddingHorizontal:Spacing.md, marginBottom:Spacing.sm, borderWidth:1, borderColor:C.border },
  catTopRow:{ flexDirection:'row', alignItems:'center', marginBottom:4 },
  catLabel:{ fontSize:14, fontWeight:'700', color:C.text, flexShrink:1, marginLeft:Spacing.xs, marginRight:4 },
  catAmountCpt:{ fontSize:12, fontWeight:'600', color:C.muted, marginRight:Spacing.sm },
  catPct:{ fontSize:13, fontWeight:'800', marginRight:Spacing.sm },
  catBar:{ height:4, backgroundColor:C.surface, borderRadius:2, overflow:'hidden' },
  catFill:{ height:4, borderRadius:2 },
  catMenuBtn:{ width:22, height:22, borderRadius:11, alignItems:'center', justifyContent:'center', marginLeft:2 },

  /* ── Empty State ─────────────── */
  emptyWrap:{ alignItems:'center', paddingVertical:40, paddingHorizontal:32, position:'relative', overflow:'hidden' },
  emptyDecor:{ position:'absolute', top:0, left:0, right:0, bottom:0, alignItems:'center', justifyContent:'center' },
  emptyCircle:{ position:'absolute', borderRadius:9999 },
  emptyCircle1:{ width:200, height:200, backgroundColor:'rgba(217,119,6,0.04)', top:-40, right:-60 },
  emptyCircle2:{ width:140, height:140, backgroundColor:'rgba(217,119,6,0.03)', bottom:10, left:-30 },
  emptyCircle3:{ width:100, height:100, backgroundColor:'rgba(217,119,6,0.02)', top:60, left:40 },
  emptyState:{ alignItems:'center' },
  emptyIcoWrap:{ width:60, height:60, borderRadius:30, backgroundColor:'#FEF3C7', alignItems:'center', justifyContent:'center', marginBottom:Spacing.lg },
  emptyTxt:{ fontSize:18, fontWeight:'800', color:C.text, marginBottom:Spacing.sm, textAlign:'center', letterSpacing:-0.2 },
  emptySub:{ fontSize:14, color:C.muted, textAlign:'center', lineHeight:20, marginBottom:Spacing.xl },
  emptyBtn:{ alignSelf:'center', flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:ACCENT, borderRadius:24, paddingVertical:Spacing.md, paddingHorizontal:Spacing.xl, shadowColor:ACCENT, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
  emptyBtnTxt:{ fontSize:15, fontWeight:'700', color:C.white },

  fabWrap:{ position:'absolute', right:Spacing.lg, bottom:Spacing.xl, shadowColor:C.dark, shadowOffset:{width:0,height:4}, shadowOpacity:0.2, shadowRadius:Spacing.sm, elevation:6, zIndex:50 },
  fab:{ width:50, height:50, borderRadius:25, backgroundColor:ACCENT, alignItems:'center', justifyContent:'center' },

  blur:{ flex:1 },
  overlay:{ flexGrow:1, justifyContent:'flex-start', alignItems:'center', paddingTop:80, paddingHorizontal:Spacing.xl, paddingBottom:Spacing.xl },
  modalCard:{ backgroundColor:C.white, borderRadius:Radius.xl, padding:Spacing.xl, width:'100%', maxWidth:360, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.15, shadowRadius:Spacing.xl, elevation:16 },
  modalHeader:{ flexDirection:'row', alignItems:'flex-start', marginBottom:Spacing.lg },
  modalHeaderText:{ flex:1 },
  closeBtn:{ width:32, height:32, borderRadius:Radius.full, backgroundColor:C.surface, alignItems:'center', justifyContent:'center', marginLeft:'auto' },
  closeBtnTxt:{ fontSize:15, fontWeight:'600', color:C.muted },
  modalTitle:{ fontSize:21, fontWeight:'800', color:C.dark },
  modalSub:{ fontSize:12, fontWeight:'700', color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6, marginTop:Spacing.md },

  adjustSub:{ fontSize:13, color:C.muted, marginTop:4 },
  adjustItem:{ flexDirection:'row', alignItems:'center', backgroundColor:C.surface, borderRadius:Radius.md, paddingVertical:Spacing.md, paddingHorizontal:Spacing.md, marginBottom:Spacing.sm, borderWidth:1, borderColor:C.border },
  adjustItemTop:{ flexDirection:'row', alignItems:'center', flex:1, marginRight:Spacing.md },
  adjustItemLabel:{ fontSize:14, fontWeight:'600', color:C.text, marginLeft:Spacing.sm },
  adjustInput:{ backgroundColor:C.white, borderRadius:Radius.md, paddingVertical:Spacing.sm, paddingHorizontal:Spacing.md, fontSize:15, fontWeight:'700', color:C.dark, borderWidth:1, borderColor:C.border, width:130, textAlign:'right' },
  adjustTotalRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:Spacing.md, borderTopWidth:1, borderTopColor:C.border, marginTop:Spacing.sm },
  adjustTotalLbl:{ fontSize:14, fontWeight:'700', color:C.text },
  adjustTotalVal:{ fontSize:17, fontWeight:'800', color:C.dark },
  modalActions:{ flexDirection:'row', gap:Spacing.md, marginTop:Spacing.xl },
  cancelBtn:{ flex:1, borderRadius:Radius.md, height:48, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:C.border, backgroundColor:C.white },
  cancelBtnPressed:{ borderColor:C.warning, backgroundColor:'#FFFBEB' },
  cancelBtnTxt:{ fontSize:14, fontWeight:'700', color:C.muted },
  saveBtn:{ flex:1, borderRadius:Radius.md, height:48, alignItems:'center', justifyContent:'center', backgroundColor:C.warning },
  saveBtnPressed:{ backgroundColor:'#D97706' },
  saveBtnDisabled:{ opacity:0.5 },
  saveBtnTxt:{ fontSize:14, fontWeight:'700', color:C.white },
  btnHalf:{ flex:1, borderRadius:Radius.md },
  successWrap:{ alignItems:'center', paddingVertical:Spacing.xl },
  successCircle:{ width:64, height:64, borderRadius:32, backgroundColor:C.green, alignItems:'center', justifyContent:'center', marginBottom:Spacing.lg },
  successIcon:{ fontSize:29, color:C.white, fontWeight:'800' },
  successTitle:{ fontSize:21, fontWeight:'800', color:C.dark, marginBottom:Spacing.xs },
  compteRow:{ flexDirection:'row', alignItems:'center', backgroundColor:C.surface, borderRadius:Radius.md, paddingVertical:Spacing.sm, paddingHorizontal:Spacing.md, marginBottom:Spacing.sm, borderWidth:1, borderColor:C.border },
  compteCheckRow:{ flexDirection:'row', alignItems:'center', flex:1, marginRight:Spacing.sm },
  checkbox:{ width:20, height:20, borderRadius:4, borderWidth:1.5, borderColor:C.muted, backgroundColor:C.white, alignItems:'center', justifyContent:'center', marginRight:Spacing.sm },
  checkboxOn:{ backgroundColor:C.warning, borderColor:C.warning },
  checkMark:{ fontSize:13, fontWeight:'800', color:C.white },
  compteLabel:{ fontSize:13, fontWeight:'600', color:C.text },
  compteSolde:{ fontSize:11, color:C.muted, marginTop:1 },
  compteInput:{ backgroundColor:C.white, borderRadius:Radius.md, paddingVertical:Spacing.sm, paddingHorizontal:Spacing.md, fontSize:14, fontWeight:'700', color:C.dark, borderWidth:1, borderColor:C.border, width:110, textAlign:'right' },
  compteTotalRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:Spacing.sm, borderTopWidth:1, borderTopColor:C.border, marginTop:Spacing.xs, marginBottom:Spacing.sm },
  compteTotalLbl:{ fontSize:13, fontWeight:'700', color:C.text },
  compteTotalVal:{ fontSize:15, fontWeight:'800', color:C.dark },
}), [C]);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [budgets, setBudgets] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [revenus, setRevenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [catBudgetInputs, setCatBudgetInputs] = useState<{catId:number,label:string,icon:string,montant:string}[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustItems, setAdjustItems] = useState<{budgetId:number,catId:number,label:string,icon:string,montant:string}[]>([]);
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [budgetComptes, setBudgetComptes] = useState<any[]>([]);
  const [selectedComptes, setSelectedComptes] = useState<{[id:number]: string}>({});
  const period = usePeriod();
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showCopySheet, setShowCopySheet] = useState(false);
  const [copySourceMonth, setCopySourceMonth] = useState(0);
  const [copySourceYear, setCopySourceYear] = useState(0);
  const [copyTargetMonth, setCopyTargetMonth] = useState(0);
  const [copyTargetYear, setCopyTargetYear] = useState(0);
  const [copyLoading, setCopyLoading] = useState(false);
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [selectedCatForMenu, setSelectedCatForMenu] = useState<any>(null);
  const [showCatEditModal, setShowCatEditModal] = useState(false);
  const [catEditValue, setCatEditValue] = useState('');
  const [catEditSaving, setCatEditSaving] = useState(false);
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [catExpenses, setCatExpenses] = useState<any[]>([]);
  const [catExpensesLoading, setCatExpensesLoading] = useState(false);
  const monthPickerAnim = useSharedValue(0);
  const monthPickerStyle = useAnimatedStyle(() => ({
    opacity: monthPickerAnim.value,
    transform: [{ scale: 0.85 + monthPickerAnim.value * 0.15 }],
  }));
  const cardAnim = useSharedValue(0);
  const barAnim = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardAnim.value,
    transform: [{ translateY: (1 - cardAnim.value) * 30 }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: barAnim.value,
  }));
  const checkAnim = useSharedValue(0);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkAnim.value }],
  }));
  const prevPeriodTypeRef = React.useRef(period.type);
  const hasAutoOpenedRef = React.useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      console.log('[Budget:load] period:', JSON.stringify({ type: period.type, debut: period.current.debut, fin: period.current.fin, mois: period.month, annee: period.year }));
      const [budgetRes, catRes, revRes, compteRes] = await Promise.all([
        api.budgets.list({ debut: period.current.debut, fin: period.current.fin }),
        api.categories.list(),
        api.revenus.list({ debut: period.current.debut, fin: period.current.fin }),
        api.comptes.list(),
      ]);
      console.log('[Budget:load] budgetRes:', JSON.stringify(budgetRes?.slice(0, 5)));
      if (budgetRes?.length) console.log('[Budget:load] Alim:', JSON.stringify(budgetRes.find((b:any)=>b.categorie_libelle==='Alimentation')));
      setBudgets(Array.isArray(budgetRes) ? budgetRes : []);
      const allCats = Array.isArray(catRes) ? catRes : [];
      setCats(allCats.filter((c:any) => c.type === 'depense'));
      setRevenus(Array.isArray(revRes) ? revRes : []);
      const cList = Array.isArray(compteRes) ? compteRes : [];
      setBudgetComptes(cList);
      comptesCache.data = cList;
      comptesCache.loaded = true;
    } catch (e: any) { console.log('[Budget:load] ERROR:', e?.message); }
    setLoading(false);
    cardAnim.value = 0;
    barAnim.value = 0;
    setTimeout(() => {
      cardAnim.value = withSpring(1, { damping: 14, stiffness: 100 });
      setTimeout(() => { barAnim.value = withTiming(1, { duration: 600 }); }, 200);
    }, 50);
  };

  useEffect(() => { period.loadAvailablePeriods(); }, []);

  useFocusEffect(useCallback(() => { load(); }, []));

  useEffect(() => {
    if (period.type !== prevPeriodTypeRef.current) {
      prevPeriodTypeRef.current = period.type;
      hasAutoOpenedRef.current = false;
      load();
    }
  }, [period.type]);

  useEffect(() => {
    if (!loading && !budgets.some(b => b.periode_type === 'quotidien' || b.periode_type === 'hebdomadaire') && !hasAutoOpenedRef.current && (period.type === 'quotidien' || period.type === 'hebdomadaire')) {
      hasAutoOpenedRef.current = true;
      setTimeout(() => {
        setCatBudgetInputs(budgetCats.map((c: any) => ({catId: c.id, label: c.libelle || 'Catégorie', icon: c.icone || '📦', montant: ''})));
        setSelectedComptes({});
        setShowBudgetModal(true);
      }, 400);
    }
  }, [loading, budgets]);

  const handleSave = async () => {
    console.log('[Budget] handleSave démarré');
    const catAmounts = catBudgetInputs
      .filter(item => item.montant && parseInt(item.montant) > 0)
      .map(item => ({
        categorie_id: item.catId,
        montant_prevu: parseInt(item.montant),
      }));
    console.log('[Budget:handleSave] catAmounts:', JSON.stringify(catAmounts), 'length:', catAmounts.length);
    if (catAmounts.length === 0) {
      console.log('[Budget:handleSave] BLOCKED: aucun montant saisi');
      Alert.alert('Erreur', 'Veuillez attribuer un montant à au moins une catégorie');
      return;
    }
    const v = catAmounts.reduce((a, c) => a + c.montant_prevu, 0);
    const comptesData = Object.entries(selectedComptes)
      .filter(([_, m]) => m && parseInt(m) > 0)
      .map(([id, m]) => ({ compte_id: parseInt(id), montant: parseInt(m) }));
    console.log('[Budget:handleSave] comptesData:', JSON.stringify(comptesData));
    const totalComptes = comptesData.reduce((a, c) => a + c.montant, 0);
    if (comptesData.length > 0 && Math.abs(totalComptes - v) > 0.01) {
      Alert.alert('Erreur', `La répartition des comptes ne correspond pas au montant total du budget.`);
      return;
    }
    if (comptesData.length > 0) {
      const totalSolde = comptesData.reduce((a, c) => {
        const compte = budgetComptes.find((bc:any) => bc.id === c.compte_id);
        return a + (compte ? parseFloat(compte.solde_actuel) : 0);
      }, 0);
      if (v > totalSolde) {
        Alert.alert('Erreur', `Solde insuffisant pour créer ce budget.`);
        return;
      }
    }
    console.log('[Budget:handleSave] validation OK, setSaving(true)');
    setSaving(true);
    console.log('[Budget:handleSave] saving=true');
    try {
      const catTotal = catAmounts.reduce((a, c) => a + c.montant_prevu, 0);
      for (let i = 0; i < catAmounts.length; i++) {
        const { categorie_id, montant_prevu } = catAmounts[i];
        const payload: any = { montant_prevu };
        if (comptesData.length > 0) {
          const proportion = montant_prevu / catTotal;
          payload.comptes = comptesData.map(c => ({
            compte_id: c.compte_id,
            montant: Math.round(c.montant * proportion),
          }));
        }
        if (period.type !== 'mensuel') {
          await api.budgets.create({ categorie_id, date_debut: period.current.debut, date_fin: period.current.fin, periode_type: period.type, ...payload });
        } else {
          const existing = budgets.find(b => b.categorie_id === categorie_id && b.mois === period.month && b.annee === period.year);
          if (existing) {
            await api.budgets.update(existing.id, payload);
          } else {
            await api.budgets.create({ categorie_id, date_debut: period.current.debut, date_fin: period.current.fin, periode_type: period.type, ...payload });
          }
        }
      }
      setSaving(false);
      await new Promise(r => setTimeout(r, 300));
      setSaveSuccess(true);
      checkAnim.value = withSpring(1, { damping: 8, stiffness: 150 });
      showToast({ type: 'success', titre: 'Budget enregistré', message: `${catAmounts.length} catégorie(s) configurée(s)`, icone: '📊' });
      notify('success', 'Budget enregistré', `${catAmounts.length} catégorie(s) configurée(s)`);
      setTimeout(() => {
        setShowBudgetModal(false);
        setSaveSuccess(false);
        checkAnim.value = 0;
        load();
      }, 700);
    } catch (e: any) {
      console.log('[Budget:handleSave] EXCEPTION:', e);
      console.log('[Budget:handleSave] EXCEPTION.message:', e.message);
      console.log('[Budget:handleSave] EXCEPTION.stack:', e.stack);
      setSaving(false);
      Alert.alert('Erreur', e.message || 'Impossible d\'enregistrer');
    }
  };

  const catBudgets = budgets.map(b => {
    const cat = cats.find(c => c.id === b.categorie_id);
    return { ...b, cat };
  }).filter(b => b.cat);

  const displayBudgets = useMemo(() => {
    if (period.type === 'mensuel') return catBudgets.filter(b => b.periode_type === 'mensuel');

    const grouped: Record<number, any> = {};
    for (const b of catBudgets) {
      const catId = b.categorie_id;
      if (!grouped[catId]) { grouped[catId] = { ...b }; continue; }
      const existing = grouped[catId];
      if (b.periode_type === 'quotidien' || b.periode_type === 'hebdomadaire') {
        grouped[catId] = {
          ...existing,
          id: existing.id,
          quotidien_id: b.id,
          quotidien_prevu: parseFloat(b.montant_prevu || 0),
          quotidien_usage: parseFloat(b.montant_utilise || b.today_usage || b.montant_depense || 0),
          quotidien_allocation: b.comptes_allocation || '',
        };
      } else if (b.periode_type === 'mensuel') {
        grouped[catId] = {
          ...b,
          quotidien_id: existing.id,
          quotidien_prevu: parseFloat(existing.montant_prevu || 0),
          quotidien_usage: parseFloat(existing.montant_utilise || existing.today_usage || existing.montant_depense || 0),
          quotidien_allocation: existing.comptes_allocation || '',
        };
      }
    }
    const merged = Object.values(grouped);
    const filtered = merged.filter((b: any) => b.periode_type === period.type || b.quotidien_id !== undefined);
    return filtered.length > 0 ? filtered : [];
  }, [catBudgets, period.type]);

  const displayList = (Array.isArray(displayBudgets) && displayBudgets.length > 0)
    ? displayBudgets
    : (period.type === 'mensuel' ? (catBudgets || []) : []);
  const isDailyView = period.type === 'quotidien' || period.type === 'hebdomadaire';
  const budgetTotal = displayList.reduce((a, b) => {
    const montant = isDailyView && b.quotidien_prevu ? b.quotidien_prevu : parseFloat(b.montant_prevu||0);
    return a + montant;
  }, 0);
  const depensesTotal = displayList.reduce((a, b) => {
    const usage = isDailyView ? (b.quotidien_usage ?? b.today_usage ?? undefined) : undefined;
    return a + (usage !== undefined ? parseFloat(usage) : parseFloat(b.montant_depense||b.montant_utilise||0));
  }, 0);
  const restant = Math.max(0, budgetTotal - depensesTotal);
  const pct = budgetTotal > 0 ? Math.round((depensesTotal / budgetTotal) * 100) : 0;
  const budgetDefined = displayList.length > 0;

  const budgetCats = cats;

  const revMois = revenus
    .filter((r: any) => {
      const d = new Date(r.date_revenu || r.date || r.created_at);
      return d.getMonth() + 1 === period.month && d.getFullYear() === period.year;
    })
    .reduce((acc: number, r: any) => acc + parseFloat(r.montant || 0), 0);
  const resteAVivre = revMois - depensesTotal;
  const depassementBudget = budgetTotal > revMois ? budgetTotal - revMois : 0;
  const santeFinanciere = depensesTotal > revMois ? 'danger'
    : budgetTotal > revMois ? 'warning' : 'sain';
  const comptesTotal = budgetComptes.reduce((a: number, c: any) => a + parseFloat(c.solde_actuel || 0), 0);
  const disponible = Math.max(0, comptesTotal - budgetTotal);
  const hasMonthlyBudget = useMemo(() => budgets.some(b => b.periode_type === 'mensuel'), [budgets]);
  const hasWeeklyBudget = useMemo(() => budgets.some(b => b.periode_type === 'hebdomadaire'), [budgets]);
  const showAccountsSection = useMemo(() => {
    if (period.type === 'mensuel') return true;
    if (period.type === 'hebdomadaire') return !hasMonthlyBudget;
    if (period.type === 'quotidien') return !hasMonthlyBudget && !hasWeeklyBudget;
    return true;
  }, [period.type, hasMonthlyBudget, hasWeeklyBudget]);
  const comptesUtilises = displayList.reduce((acc: any[], b: any) => {
    const raw = (period.type !== 'mensuel' && b.quotidien_allocation) ? b.quotidien_allocation : (b.comptes_allocation || '');
    const parts = raw.split('||').filter(Boolean);
    for (const part of parts) {
      const [compte_id, montant, ...nomParts] = part.split(':');
      const nom = nomParts.join(':');
      const existing = acc.find(x => x.compte_id === parseInt(compte_id));
      if (existing) existing.montant += parseFloat(montant);
      else acc.push({ compte_id: parseInt(compte_id), montant: parseFloat(montant), nom });
    }
    return acc;
  }, []);

  const openAdjust = () => {
    setAdjustItems((displayBudgets.length > 0 ? displayBudgets : catBudgets).map(b => ({
      budgetId: b.id,
      catId: b.categorie_id,
      label: b.cat?.libelle || 'Catégorie',
      icon: b.cat?.icone || '📦',
      montant: String(b.montant_prevu || 0),
    })));
    setShowAdjust(true);
  };

  const handleAdjustSave = async () => {
    setAdjustSaving(true);
    try {
      for (const item of adjustItems) {
        const v = parseInt(item.montant);
        if (!v || v <= 0) continue;
        await api.budgets.update(item.budgetId, { montant_prevu: v });
      }
      setShowAdjust(false);
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de modifier');
    }
    setAdjustSaving(false);
  };

  const handleDeleteBudget = (budget: any) => {
    Alert.alert(
      'Supprimer cette catégorie du budget',
      `Voulez-vous supprimer le budget pour ${budget.cat?.libelle || 'cette catégorie'} ?\n\nLe montant réservé sera recrédité sur le compte. Les dépenses déjà enregistrées resteront dans l'historique.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.budgets.remove(budget.id);
              setBudgets(prev => prev.filter(b => b.id !== budget.id));
              showToast({ type: 'info', titre: 'Budget supprimé', message: `${budget.cat?.libelle || 'Catégorie'}`, icone: '🗑️' });
              notify('info', 'Budget supprimé', `${budget.cat?.libelle || 'Catégorie'}`);
            } catch (e: any) {
              Alert.alert('Erreur', e.message || 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const handleMonthChange = (mo: number, yr: number) => {
    setShowMonthPicker(false);
    monthPickerAnim.value = withTiming(0);
    period.changePeriod(mo, yr);
    const budgets = budgets.filter(b => b.mois === mo && b.annee === yr);
    if (budgets.length === 0) {
      const prevMo = mo === 1 ? 12 : mo - 1;
      const prevYr = mo === 1 ? yr - 1 : yr;
      const prevBudgets = budgets.filter(b => b.mois === prevMo && b.annee === prevYr);
      if (prevBudgets.length > 0) {
        setCopySourceMonth(prevMo);
        setCopySourceYear(prevYr);
        setCopyTargetMonth(mo);
        setCopyTargetYear(yr);
        setShowCopySheet(true);
        return;
      }
    }
  };

  const handleCopyBudget = async () => {
    setCopyLoading(true);
    try {
      const sourceBudgets = budgets.filter(
        b => b.mois === copySourceMonth && b.annee === copySourceYear
      );
      const copyDebut = `${copyTargetYear}-${String(copyTargetMonth).padStart(2, '0')}-01`;
      const copyFin = new Date(copyTargetYear, copyTargetMonth, 0).toISOString().split('T')[0];
      for (const sb of sourceBudgets) {
        await api.budgets.create({
          categorie_id: sb.categorie_id,
          montant_prevu: parseFloat(sb.montant_prevu),
          date_debut: copyDebut,
          date_fin: copyFin,
          periode_type: period.type,
        });
      }
      setShowCopySheet(false);
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de copier le budget');
    }
    setCopyLoading(false);
  };

  const updateBudgetLocally = (budgetId: number, newMontant: number) => {
    setBudgets(prev => prev.map(b =>
      b.id === budgetId ? { ...b, montant_prevu: newMontant } : b
    ));
  };

  const loadCatExpenses = async (catId: number) => {
    setCatExpensesLoading(true);
    try {
      const all = await api.depenses.list();
      const filtered = (Array.isArray(all) ? all : []).filter((d: any) => {
        const dDate = new Date(d.date_depense || d.date || d.created_at);
        return d.categorie_id === catId && dDate.getMonth() + 1 === period.month && dDate.getFullYear() === period.year;
      });
      setCatExpenses(filtered);
    } catch {}
    setCatExpensesLoading(false);
  };

  const handleCatEditSave = async () => {
    if (!selectedCatForMenu) return;
    setCatEditSaving(true);
    try {
      const v = parseInt(catEditValue);
      if (!v || v <= 0) { Alert.alert('Erreur', 'Montant invalide'); return; }
      await api.budgets.update(selectedCatForMenu.id, { montant_prevu: v });
      updateBudgetLocally(selectedCatForMenu.id, v);
      setShowCatEditModal(false);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de modifier');
    }
    setCatEditSaving(false);
  };

  const handleDeleteAllBudgets = () => {
    Alert.alert(
      'Supprimer tous les budgets',
      `Vous allez supprimer tous les budgets de ${MONTHS[period.month-1]} ${period.year}.\n\nLes montants réservés seront recrédités sur vos comptes.\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const b of budgets) {
                await api.budgets.remove(b.id);
              }
              budgetsCache.data = null;
              budgetsCache.loaded = false;
              comptesCache.data = null;
              comptesCache.loaded = false;
              load();
            } catch (e: any) {
              Alert.alert('Erreur', e.message || 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper style={s.root}>
      <StatusBar style="light" />

      <PageHeader
        title="Budget"
        icon="📊"
        color={C.dark}
        right={
          <TouchableOpacity onPress={()=>setShowMenu(true)} style={s.menuBtn} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color="#FFF" />
          </TouchableOpacity>
        }
        bottom={
          <View style={s.monthRow}>
            <PeriodSelector
              selectedMonth={period.month}
              selectedYear={period.year}
              onChange={period.changePeriod}
              onChangeDate={period.changeDate}
              selectedDate={period.current.debut}
              periodType={period.type}
              onTypeChange={(t) => period.changeToPeriod(t)}
              triggerColor="#FFF"
              showCurrentMonthOption={false}
            />
          </View>
        }
      />

      {/* ── Month Picker ────────────────── */}
      {showMonthPicker && (
        <View style={s.monthPickerOverlay}>
          <Pressable style={{flex:1}} onPress={()=>{setShowMonthPicker(false); monthPickerAnim.value=withTiming(0);}} />
          <Animated.View style={[s.monthPickerCard, monthPickerStyle]}>
            <ScrollView style={{maxHeight:280}}>
              {Array.from({length:12}, (_, i) => {
                const m = currentMonth - i;
                const mo = ((m + 11) % 12) + 1;
                const yr = currentYear + (m <= 0 ? -1 : 0);
                const sel = mo === period.month && yr === period.year;
                return (
                  <Pressable
                    key={`${mo}-${yr}`}
                    style={[s.monthPickerItem, sel && s.monthPickerItemActive]}
                    onPress={() => handleMonthChange(mo, yr)}
                  >
                    <Text style={[s.monthPickerItemText, sel && s.monthPickerItemTextActive]}>
                      {MONTHS[mo-1]} {yr}
                    </Text>
                    {sel && <Text style={s.monthPickerCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
          <Pressable style={{flex:1}} onPress={()=>{setShowMonthPicker(false); monthPickerAnim.value=withTiming(0);}} />
        </View>
      )}

      {/* ── Menu ⋮ (Action Sheet) ───────── */}
      <Modal visible={showMenu} transparent animationType="none" onRequestClose={()=>setShowMenu(false)}>
        <BlurView intensity={15} tint="dark" style={s.blur}>
          <Pressable style={s.overlayActions} onPress={()=>setShowMenu(false)}>
            <Pressable onPress={()=>{}} style={s.actionSheet}>
              {budgetDefined ? (
                <>
                  <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowMenu(false); openAdjust();}} activeOpacity={0.7}>
                    <Ionicons name="pencil-outline" size={16} color={C.text} />
                    <Text style={s.actionBtnTxt}>Modifier le budget</Text>
                  </TouchableOpacity>
                  <View style={s.actionDivider} />
                  <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowMenu(false); setShowMonthPicker(true); monthPickerAnim.value=withSpring(1,{damping:14,stiffness:100});}} activeOpacity={0.7}>
                    <Ionicons name="calendar-outline" size={16} color={C.text} />
                    <Text style={s.actionBtnTxt}>Changer de mois</Text>
                  </TouchableOpacity>
                  <View style={s.actionDivider} />
                  <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowMenu(false); handleDeleteAllBudgets();}} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={16} color={C.danger} />
                    <Text style={[s.actionBtnTxt, {color: C.danger}]}>Supprimer le budget</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowMenu(false); if (period.type === 'quotidien' && budgetCats.length === 0) { Alert.alert('Aucune catégorie quotidienne', 'Marquez d\'abord des catégories comme « Visible au quotidien » dans la page Catégories.'); return; } setShowBudgetModal(true); setCatBudgetInputs(budgetCats.map((c: any) => ({catId:c.id,label:c.libelle||'Catégorie',icon:c.icone||'📦',montant:''}))); setSelectedComptes({});}} activeOpacity={0.7}>
                    <Ionicons name="add-outline" size={16} color={C.text} />
                    <Text style={s.actionBtnTxt}>Créer un budget</Text>
                  </TouchableOpacity>
                  <View style={s.actionDivider} />
                  <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowMenu(false); setShowMonthPicker(true); monthPickerAnim.value=withSpring(1,{damping:14,stiffness:100});}} activeOpacity={0.7}>
                    <Ionicons name="calendar-outline" size={16} color={C.text} />
                    <Text style={s.actionBtnTxt}>Changer de mois</Text>
                  </TouchableOpacity>
                </>
              )}
            </Pressable>
          </Pressable>
        </BlurView>
      </Modal>

      {/* ── Copy Budget Bottom Sheet ────── */}
      <Modal visible={showCopySheet} transparent animationType="none" onRequestClose={()=>setShowCopySheet(false)}>
        <BlurView intensity={15} tint="dark" style={s.blur}>
          <Pressable style={s.overlayActions} onPress={()=>setShowCopySheet(false)}>
            <Pressable onPress={()=>{}} style={s.actionSheet}>
              <Text style={s.copyTitle}>Aucun budget n'existe pour {MONTHS[copyTargetMonth-1]} {copyTargetYear}.</Text>
              <Text style={s.copySub}>Souhaitez-vous copier celui de {MONTHS[copySourceMonth-1]} {copySourceYear} ?</Text>
              <View style={s.actionDivider} />
              <TouchableOpacity style={s.actionBtn} onPress={handleCopyBudget} activeOpacity={0.7} disabled={copyLoading}>
                <Ionicons name="clipboard-outline" size={16} color={C.text} />
                <Text style={s.actionBtnTxt}>
                  {copyLoading ? 'Copie en cours...' : `Copier le budget de ${MONTHS[copySourceMonth-1]} ${copySourceYear} (recommandé)`}
                </Text>
              </TouchableOpacity>
              <View style={s.actionDivider} />
              <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowCopySheet(false); if (period.type === 'quotidien' && budgetCats.length === 0) { Alert.alert('Aucune catégorie quotidienne', 'Marquez d\'abord des catégories comme « Visible au quotidien » dans la page Catégories.'); return; } setShowBudgetModal(true); setCatBudgetInputs(budgetCats.map((c: any) => ({catId:c.id,label:c.libelle||'Catégorie',icon:c.icone||'📦',montant:''}))); setSelectedComptes({});}} activeOpacity={0.7}>
                <Ionicons name="add-outline" size={16} color={C.text} />
                <Text style={s.actionBtnTxt}>Créer un nouveau budget</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </BlurView>
      </Modal>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={C.white} />
          </View>
        ) : (
          <View style={s.body}>
            {budgetDefined ? (
              <>
                <Animated.View style={[s.summaryCard, cardStyle]}>
                  <Text style={s.summaryLabel}>Budget{isDailyView ? ' journalier' : ''} total</Text>
                  <Text style={s.summaryAmount}>{fmt(budgetTotal)}</Text>

                  <View style={s.summaryBarRow}>
                    <View style={s.summaryBarOuter}>
                      <Animated.View style={[s.summaryBarInner, barStyle, { width: `${pct}%`, backgroundColor: pct > 80 ? C.danger : pct > 60 ? C.warning : C.green }]} />
                    </View>
                    <Text style={s.summaryPct}>{pct}%</Text>
                  </View>

                  <Text style={s.summaryProgress}>
                    {depensesTotal > 0 ? `${pct}% utilisé` : `0 / ${dotSep(Math.round(budgetTotal))} FCFA`}
                  </Text>

                  <Text style={s.summaryMeta}>{displayList.length} catégories · {comptesUtilises.length} comptes</Text>

                  <View style={s.summaryFooter}>
                    <View style={s.summaryFooterItem}>
                      <Text style={s.summaryFooterVal}>{fmt(depensesTotal)}</Text>
                      <View style={s.summaryFooterLblRow}>
                        <Ionicons name="wallet-outline" size={7} color="rgba(255,255,255,0.45)" />
                        <Text style={s.summaryFooterLbl}> Utilisé</Text>
                      </View>
                    </View>
                    <View style={s.summaryFooterDivider} />
                    <View style={s.summaryFooterItem}>
                      <Text style={[s.summaryFooterVal, { color: '#FBBF24' }]}>{fmt(restant)}</Text>
                      <View style={s.summaryFooterLblRow}>
                        <Ionicons name="trending-up-outline" size={7} color="rgba(255,255,255,0.45)" />
                        <Text style={s.summaryFooterLbl}> Restant</Text>
                      </View>
                    </View>
                    <View style={s.summaryFooterDivider} />
                    <View style={s.summaryFooterItem}>
                      <TouchableOpacity onPress={() => Alert.alert('Disponible', "Argent disponible sur vos comptes qui n'est pas encore réservé dans un budget.")}>
                        <View style={s.disponibleRow}>
                          <Text style={[s.summaryFooterVal, { color: 'rgba(255,255,255,0.7)' }]}>{fmt(disponible)}</Text>
                          <Ionicons name="information-circle-outline" size={9} color="rgba(255,255,255,0.4)" />
                        </View>
                      </TouchableOpacity>
                      <View style={s.summaryFooterLblRow}>
                        <Ionicons name="business-outline" size={7} color="rgba(255,255,255,0.45)" />
                        <Text style={s.summaryFooterLbl}> Disponible</Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>

                {comptesUtilises.length > 0 && showAccountsSection && (
                  <>
                    <View style={s.sectionTitleRow}>
                      <Ionicons name="card-outline" size={12} color={C.text} style={{marginRight:4}} />
                      <Text style={s.sectionTitle}>Comptes utilisés</Text>
                    </View>
                    {comptesUtilises.map((cu: any) => (
                      <View key={cu.compte_id} style={s.compteUtiliseRow}>
                        <Ionicons name="business-outline" size={14} color={C.muted} style={{width:22}} />
                        <Text style={s.compteUtiliseNom} numberOfLines={1}>{cu.nom}</Text>
                        <Text style={s.compteUtiliseMt}>{fmt(cu.montant)} réservés</Text>
                      </View>
                    ))}
                  </>
                )}

                <View style={s.sectionTitleRow}>
                  <Ionicons name="pie-chart-outline" size={12} color={C.text} style={{marginRight:4}} />
                  <Text style={s.sectionTitle}>Répartition par catégorie</Text>
                </View>
                {displayBudgets.map((b,i) => {
                  if (b.cat?.libelle === 'Alimentation') console.log('[Budget:card] today_usage:', b.today_usage, 'quotidien_usage:', b.quotidien_usage, 'montant_depense:', b.montant_depense, 'montant_utilise:', b.montant_utilise);
                  const isDailyMode = period.type === 'quotidien' || period.type === 'hebdomadaire';
                  const hasCategoryMonthly = b.periode_type === 'mensuel';
                  const monthlyPrevu = hasCategoryMonthly ? parseFloat(b.montant_prevu || 0) : 0;
                  const monthlyUtilise = parseFloat(b.montant_depense || b.montant_utilise || 0);
                  const qp = b.quotidien_prevu || 0;
                  const utilise = isDailyMode && b.quotidien_usage !== undefined
                    ? b.quotidien_usage
                    : monthlyUtilise;
                  const prevu = isDailyMode && qp ? qp : monthlyPrevu;
                  const reserveUtilise = isDailyMode && qp > 0 ? Math.round(Math.min(utilise, qp)) : 0;
                  const reserveEpuise = isDailyMode && qp > 0 && utilise >= qp;
                  const cp = prevu > 0 ? Math.round((utilise / prevu) * 100) : 0;
                  const reserveLabel = period.type === 'quotidien' ? "aujourd'hui" : 'cette semaine';
                  return (
                    <View key={i} style={s.catCard}>
                      <View style={s.catTopRow}>
                        <Ionicons name={toIcon(b.cat?.icone) as any} size={13} color={C.text} style={{width:18, textAlign:'center'}} />
                        <Text style={s.catLabel} numberOfLines={1}>{b.cat?.libelle||'Catégorie'}</Text>
                        <Text style={s.catAmountCpt}>{dotSep(Math.round(utilise))}/{dotSep(Math.round(prevu))}</Text>
                        <Text style={[s.catPct, {color:cp>100?C.danger:cp===100?C.warning:cp>70?C.warning:C.green}]}>{cp}%</Text>
                        <View style={{flex:1}} />
                        <TouchableOpacity onPress={() => { setSelectedCatForMenu(b); setShowCatMenu(true); }} style={s.catMenuBtn} hitSlop={6}>
                          <Ionicons name="ellipsis-vertical" size={11} color={C.muted} />
                        </TouchableOpacity>
                      </View>
                      <View style={s.catBar}>
                        <View style={[s.catFill,{width:`${Math.min(cp,100)}%`,backgroundColor:cp>100?C.danger:cp===100?C.warning:cp>70?C.warning:C.green}]}/>
                      </View>
                      {isDailyMode && qp > 0 ? (
                        <Text style={{fontSize:10, color: reserveEpuise ? C.danger : '#F59E0B', marginTop:2}}>
                          {fmt(reserveUtilise)}/{fmt(qp)} {reserveLabel}
                          {reserveEpuise ? <Text style={{fontWeight:'700'}}> ÉPUISÉ</Text> : null}
                        </Text>
                      ) : parseFloat(b.montant_reserve||0) > 0 ? (
                        <View style={{flexDirection:'row', alignItems:'center', marginTop:2}}>
                          <Text style={{fontSize:10, color:'#F59E0B'}}>
                            {fmt(parseFloat(b.montant_reserve))} réservé sur {fmt(monthlyPrevu)} mensuel
                          </Text>
                          <Ionicons name="chevron-forward" size={10} color="#F59E0B" style={{marginHorizontal:3}} />
                          <Text style={{fontSize:10, color:'#F59E0B'}}>{fmt(monthlyPrevu - parseFloat(b.montant_reserve))} restant</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={s.emptyWrap}>
                <View style={s.emptyDecor}>
                  <View style={[s.emptyCircle, s.emptyCircle1]} />
                  <View style={[s.emptyCircle, s.emptyCircle2]} />
                  <View style={[s.emptyCircle, s.emptyCircle3]} />
                </View>
                <View style={s.emptyState}>
                  <View style={s.emptyIcoWrap}>
                    <Ionicons name="bar-chart-outline" size={26} color={ACCENT} />
                  </View>
                  <Text style={s.emptyTxt}>{period.type === 'quotidien' ? 'Aucun budget pour aujourd\'hui' : `Aucun budget pour ${MONTHS[period.month-1]} ${period.year}`}</Text>
                  <Text style={s.emptySub}>
                    Commencez par créer votre premier budget.{'\n'}
                    Vous pourrez ensuite suivre vos dépenses,{'\n'}
                    vos catégories et votre progression.
                  </Text>
                  <TouchableOpacity style={s.emptyBtn} onPress={() => {
                    if (period.type === 'quotidien' && budgetCats.length === 0) {
                      Alert.alert('Aucune catégorie quotidienne', 'Marquez d\'abord des catégories comme « Visible au quotidien » dans la page Catégories.');
                      return;
                    }
                    setCatBudgetInputs(budgetCats.map((c: any) => ({
                      catId: c.id,
                      label: c.libelle || 'Catégorie',
                      icon: c.icone || '📦',
                      montant: '',
                    })));
                    setSelectedComptes({});
                    setShowBudgetModal(true);
                  }} activeOpacity={0.85}>
                    <Ionicons name="add-outline" size={16} color={C.white} style={{marginRight:4}} />
                    <Text style={s.emptyBtnTxt}>Créer mon premier budget</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── FAB ───────────────────────────── */}
      {(budgetDefined || cats.length > 0) && (
        <View style={[s.fabWrap, { bottom: FAB_BOTTOM }]}>
          <TouchableOpacity
            style={s.fab}
            onPress={() => setShowFabMenu(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color={C.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── FAB Menu (Action Sheet) ────────── */}
      <Modal visible={showFabMenu} transparent animationType="none" onRequestClose={()=>setShowFabMenu(false)}>
        <BlurView intensity={15} tint="dark" style={s.blur}>
          <Pressable style={s.overlayActions} onPress={()=>setShowFabMenu(false)}>
            <Pressable onPress={()=>{}} style={s.actionSheet}>
              {budgetDefined && (
                <>
                  <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowFabMenu(false); openAdjust();}} activeOpacity={0.7}>
                    <Ionicons name="pencil-outline" size={16} color={C.text} />
                    <Text style={s.actionBtnTxt}>Modifier le budget</Text>
                  </TouchableOpacity>
                  <View style={s.actionDivider} />
                </>
              )}
              <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowFabMenu(false); if (period.type === 'quotidien' && budgetCats.length === 0) { Alert.alert('Aucune catégorie quotidienne', 'Marquez d\'abord des catégories comme « Visible au quotidien » dans la page Catégories.'); return; } setShowBudgetModal(true); setCatBudgetInputs(budgetCats.map((c: any) => ({catId:c.id,label:c.libelle||'Catégorie',icon:c.icone||'📦',montant:''}))); setSelectedComptes({});}} activeOpacity={0.7}>
                <Ionicons name="add-outline" size={16} color={C.text} />
                <Text style={s.actionBtnTxt}>Ajouter une catégorie</Text>
              </TouchableOpacity>
              <View style={s.actionDivider} />
              <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowFabMenu(false);               const prevMo = period.month === 1 ? 12 : period.month - 1; const prevYr = period.month === 1 ? period.year - 1 : period.year; setCopySourceMonth(prevMo); setCopySourceYear(prevYr); setCopyTargetMonth(period.month); setCopyTargetYear(period.year); setShowCopySheet(true);}} activeOpacity={0.7}>
                <Ionicons name="clipboard-outline" size={16} color={C.text} />
                <Text style={s.actionBtnTxt}>Copier le mois précédent</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </BlurView>
      </Modal>

      <Modal visible={showBudgetModal} transparent animationType="none" onRequestClose={()=>setShowBudgetModal(false)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{flex:1, position:'relative'}}>
          <BlurView intensity={15} tint="dark" style={s.blur}>
            <ScrollView contentContainerStyle={s.overlay} keyboardShouldPersistTaps="always">
              <Pressable onPress={() => Keyboard.dismiss()} style={{ width: '100%' }}>
              <View style={s.modalCard}>
                {saveSuccess ? (
                  <View style={s.successWrap}>
                    <Animated.View style={[s.successCircle, checkStyle]}>
                      <Text style={s.successIcon}>✓</Text>
                    </Animated.View>
                    <Text style={s.successTitle}>Budget enregistré !</Text>
                  </View>
                ) : (
                  <>
                    <View style={s.modalHeader}>
                      <View style={s.modalHeaderText}>
                        <Text style={s.modalTitle}>{period.type === 'quotidien' ? 'Budget journalier' : period.type === 'hebdomadaire' ? 'Budget hebdomadaire' : 'Budget mensuel'}</Text>
                      </View>
                      <Pressable onPress={()=>setShowBudgetModal(false)} style={s.closeBtn} hitSlop={8}>
                        <Text style={s.closeBtnTxt}>✕</Text>
                      </Pressable>
                    </View>
                    <Text style={s.modalSub}>{period.type === 'quotidien' ? 'Montant par catégorie (facultatif)' : 'Attribuez un montant par catégorie'}</Text>
                    {catBudgetInputs.length === 0 && period.type === 'quotidien' ? (
                      <View style={{alignItems:'center', paddingVertical:Spacing.lg}}>
                        <Ionicons name="alert-circle-outline" size={28} color={C.warning} />
                        <Text style={{fontSize:13, color:C.muted, textAlign:'center', marginTop:Spacing.sm}}>
                          Aucune catégorie marquée comme quotidienne.{'\n'}
                          Allez dans Catégories pour activer{'\n'}
                          l\'option « Visible au quotidien ».
                        </Text>
                      </View>
                    ) : catBudgetInputs.map((item, i) => (
                      <View key={i} style={s.adjustItem}>
                        <View style={s.adjustItemTop}>
                          <Text style={{fontSize:19}}>{item.icon}</Text>
                          <Text style={s.adjustItemLabel}>{item.label}</Text>
                        </View>
                        <TextInput
                          style={s.adjustInput}
                          value={item.montant}
                          onChangeText={t => {
                            const next = [...catBudgetInputs];
                            next[i] = { ...next[i], montant: t };
                            setCatBudgetInputs(next);
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={C.hint}
                        />
                      </View>
                    ))}
                    <View style={s.adjustTotalRow}>
                      <Text style={s.adjustTotalLbl}>Budget total</Text>
                      <Text style={s.adjustTotalVal}>
                        {fmt(catBudgetInputs.reduce((a, i) => a + (parseInt(i.montant) || 0), 0))}
                      </Text>
                    </View>
                    {budgetComptes.length > 0 && showAccountsSection && (
                      <>
                        <Text style={s.modalSub}>Déduire de</Text>
                        {budgetComptes.map((c:any) => {
                          const checked = selectedComptes.hasOwnProperty(c.id);
                          const solde = parseFloat(c.solde_actuel || 0);
                          return (
                            <View key={c.id} style={s.compteRow}>
                              <Pressable
                                style={s.compteCheckRow}
                                onPress={() => {
                                  const next = { ...selectedComptes };
                                  if (checked) {
                                    delete next[c.id];
                                  } else {
                                    next[c.id] = '';
                                  }
                                  setSelectedComptes(next);
                                }}
                              >
                                <View style={[s.checkbox, checked && s.checkboxOn]}>
                                  {checked && <Text style={s.checkMark}>✓</Text>}
                                </View>
                                <View style={{flex:1}}>
                                  <Text style={s.compteLabel} numberOfLines={1}>{c.nom_compte || `Compte #${c.id}`}</Text>
                                  <Text style={s.compteSolde}>Solde: {fmt(solde)}</Text>
                                </View>
                              </Pressable>
                              {checked && (
                                <TextInput
                                  style={s.compteInput}
                                  value={selectedComptes[c.id]}
                                  onChangeText={t => setSelectedComptes({...selectedComptes, [c.id]: t})}
                                  placeholder="Montant"
                                  placeholderTextColor={C.hint}
                                  keyboardType="numeric"
                                />
                              )}
                            </View>
                          );
                        })}
                        {Object.keys(selectedComptes).length > 0 && (
                          <View style={s.compteTotalRow}>
                            <Text style={s.compteTotalLbl}>Total déduit</Text>
                            <Text style={s.compteTotalVal}>
                              {fmt(Object.values(selectedComptes).reduce((a:number,v:string) => a + (parseInt(v)||0), 0))}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                    <View style={s.modalActions}>
                      <Pressable
                        style={({pressed})=>[s.cancelBtn, s.btnHalf, pressed&&s.cancelBtnPressed]}
                        onPress={()=>setShowBudgetModal(false)}
                      >
                        <Text style={s.cancelBtnTxt}>Annuler</Text>
                      </Pressable>
                       <Pressable
                         style={({pressed})=>[s.saveBtn, s.btnHalf, pressed&&s.saveBtnPressed, saving&&s.saveBtnDisabled]}
                         onPress={() => { console.log('[Budget] Bouton Enregistrer pressé'); handleSave(); }}
                       >
                        {saving ? <ActivityIndicator color={C.white} size="small" /> : <Text style={s.saveBtnTxt}>Enregistrer</Text>}
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
              </Pressable>
            </ScrollView>
          </BlurView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showAdjust} transparent animationType="none" onRequestClose={()=>setShowAdjust(false)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{flex:1, position:'relative'}}>
          <BlurView intensity={15} tint="dark" style={s.blur}>
            <ScrollView contentContainerStyle={s.overlay} keyboardShouldPersistTaps="handled">
              <Pressable onPress={() => Keyboard.dismiss()} style={{ width: '100%' }}>
              <View style={s.modalCard}>
                <View style={s.modalHeader}>
                  <View style={s.modalHeaderText}>
                    <View style={{flexDirection:'row', alignItems:'center', gap:6}}>
                      <Ionicons name="pencil-outline" size={18} color={C.dark} />
                      <Text style={s.modalTitle}>Ajuster par catégorie</Text>
                    </View>
                    <Text style={s.adjustSub}>Attribuez un montant à chaque catégorie</Text>
                  </View>
                  <Pressable onPress={()=>setShowAdjust(false)} style={s.closeBtn} hitSlop={8}>
                    <Text style={s.closeBtnTxt}>✕</Text>
                  </Pressable>
                </View>

                {adjustItems.map((item, i) => (
                  <View key={i} style={s.adjustItem}>
                    <View style={s.adjustItemTop}>
                      <Text style={{fontSize:19}}>{item.icon}</Text>
                      <Text style={s.adjustItemLabel}>{item.label}</Text>
                    </View>
                    <TextInput
                      style={s.adjustInput}
                      value={item.montant}
                      onChangeText={t => {
                        const next = [...adjustItems];
                        next[i] = { ...next[i], montant: t };
                        setAdjustItems(next);
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={C.hint}
                    />
                  </View>
                ))}

                <View style={s.adjustTotalRow}>
                  <Text style={s.adjustTotalLbl}>Budget mensuel</Text>
                  <Text style={s.adjustTotalVal}>
                    {fmt(adjustItems.reduce((a, i) => a + (parseInt(i.montant) || 0), 0))}
                  </Text>
                </View>

                <View style={s.modalActions}>
                  <Pressable
                    style={({pressed})=>[s.cancelBtn, s.btnHalf, pressed&&s.cancelBtnPressed]}
                    onPress={()=>setShowAdjust(false)}
                  >
                    <Text style={s.cancelBtnTxt}>Annuler</Text>
                  </Pressable>
                  <Pressable
                    style={({pressed})=>[s.saveBtn, s.btnHalf, pressed&&s.saveBtnPressed]}
                    onPress={handleAdjustSave}
                    disabled={adjustSaving}
                  >
                    {adjustSaving ? <ActivityIndicator color={C.white} size="small" /> : <Text style={s.saveBtnTxt}>Enregistrer</Text>}
                  </Pressable>
                </View>
              </View>
              </Pressable>
            </ScrollView>
          </BlurView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Cat Edit Modal ──────────────── */}
      <Modal visible={showCatEditModal} transparent animationType="none" onRequestClose={()=>setShowCatEditModal(false)}>
        <View style={{flex:1, position:'relative'}}>
          <BlurView intensity={15} tint="dark" style={s.blur}>
            <ScrollView contentContainerStyle={s.overlay} keyboardShouldPersistTaps="always">
              <Pressable onPress={()=>setShowCatEditModal(false)} style={{width:'100%', maxWidth:360, alignSelf:'center'}}>
                <Pressable onPress={()=>{}} style={s.modalCard}>
                  <View style={s.modalHeader}>
                    <View style={s.modalHeaderText}>
                      <View style={{flexDirection:'row', alignItems:'center', gap:6}}>
                        <Ionicons name="pencil-outline" size={18} color={C.dark} />
                        <Text style={s.modalTitle}>Modifier le montant</Text>
                      </View>
                      <Text style={s.adjustSub}>{selectedCatForMenu?.cat?.libelle||'Catégorie'}</Text>
                    </View>
                    <Pressable onPress={()=>setShowCatEditModal(false)} style={s.closeBtn} hitSlop={8}>
                      <Text style={s.closeBtnTxt}>✕</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    style={[s.adjustInput, {width:'100%', marginVertical:Spacing.md}]}
                    value={catEditValue}
                    onChangeText={setCatEditValue}
                    keyboardType="numeric"
                    placeholder="Montant prévu"
                    placeholderTextColor={C.hint}
                    autoFocus
                  />
                  <View style={s.modalActions}>
                    <Pressable style={({pressed})=>[s.cancelBtn, s.btnHalf, pressed&&s.cancelBtnPressed]} onPress={()=>setShowCatEditModal(false)}>
                      <Text style={s.cancelBtnTxt}>Annuler</Text>
                    </Pressable>
                    <Pressable style={({pressed})=>[s.saveBtn, s.btnHalf, pressed&&s.saveBtnPressed]} onPress={handleCatEditSave} disabled={catEditSaving}>
                      {catEditSaving ? <ActivityIndicator color={C.white} size="small" /> : <Text style={s.saveBtnTxt}>Enregistrer</Text>}
                    </Pressable>
                  </View>
                </Pressable>
              </Pressable>
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* ── Expenses Modal ──────────────── */}
      <Modal visible={showExpensesModal} transparent animationType="none" onRequestClose={()=>setShowExpensesModal(false)}>
        <View style={{flex:1, position:'relative'}}>
          <BlurView intensity={15} tint="dark" style={s.blur}>
            <ScrollView contentContainerStyle={s.overlay} keyboardShouldPersistTaps="always">
              <Pressable onPress={()=>setShowExpensesModal(false)} style={{width:'100%', maxWidth:360, alignSelf:'center'}}>
                <Pressable onPress={()=>{}} style={s.modalCard}>
                  <View style={s.modalHeader}>
                    <View style={s.modalHeaderText}>
                      <View style={{flexDirection:'row', alignItems:'center', gap:6}}>
                        <Ionicons name="list-outline" size={18} color={C.dark} />
                        <Text style={s.modalTitle}>{selectedCatForMenu?.cat?.libelle||'Catégorie'}</Text>
                      </View>
                        <Text style={s.adjustSub}>{MONTHS[period.month-1]} {period.year}</Text>
                    </View>
                    <Pressable onPress={()=>setShowExpensesModal(false)} style={s.closeBtn} hitSlop={8}>
                      <Text style={s.closeBtnTxt}>✕</Text>
                    </Pressable>
                  </View>
                  {catExpensesLoading ? (
                    <ActivityIndicator color={C.warning} style={{marginVertical:Spacing.xl}} />
                  ) : catExpenses.length === 0 ? (
                    <View style={{alignItems:'center', paddingVertical:Spacing.xl}}>
                      <Ionicons name="receipt-outline" size={36} color={C.hint} />
                      <Text style={{fontSize:14, color:C.muted, marginTop:Spacing.sm, textAlign:'center'}}>Aucune dépense enregistrée pour cette catégorie.</Text>
                    </View>
                  ) : (
                    catExpenses.map((d: any, i: number) => (
                      <View key={d.id||i} style={[s.adjustItem, {flexDirection:'row', alignItems:'center'}]}>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:14, fontWeight:'600', color:C.text}}>{d.libelle || d.description || 'Sans libellé'}</Text>
                          <Text style={{fontSize:11, color:C.muted, marginTop:1}}>{new Date(d.date_depense || d.date || d.created_at).toLocaleDateString('fr-FR')}</Text>
                        </View>
                        <Text style={{fontSize:15, fontWeight:'800', color:C.danger}}>-{fmt(parseFloat(d.montant||0))}</Text>
                      </View>
                    ))
                  )}
                </Pressable>
              </Pressable>
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* ── Category Menu (⋮) ─────────────── */}
      <Modal visible={showCatMenu} transparent animationType="none" onRequestClose={()=>setShowCatMenu(false)}>
        <BlurView intensity={15} tint="dark" style={s.blur}>
          <Pressable style={s.overlayActions} onPress={()=>setShowCatMenu(false)}>
            <Pressable onPress={()=>{}} style={s.actionSheet}>
              <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowCatMenu(false); if (selectedCatForMenu) { setCatEditValue(String(selectedCatForMenu.montant_prevu||0)); setShowCatEditModal(true); } }} activeOpacity={0.7}>
                <Ionicons name="pencil-outline" size={16} color={C.text} />
                <Text style={s.actionBtnTxt}>Modifier le montant prévu</Text>
              </TouchableOpacity>
              <View style={s.actionDivider} />
              <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowCatMenu(false); if (selectedCatForMenu) { loadCatExpenses(selectedCatForMenu.categorie_id); setShowExpensesModal(true); } }} activeOpacity={0.7}>
                <Ionicons name="list-outline" size={16} color={C.text} />
                <Text style={s.actionBtnTxt}>Voir les dépenses</Text>
              </TouchableOpacity>
              <View style={s.actionDivider} />
              <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowCatMenu(false); if (selectedCatForMenu) handleDeleteBudget(selectedCatForMenu);}} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={16} color={C.danger} />
                <Text style={[s.actionBtnTxt, {color: C.danger}]}>Supprimer cette catégorie du budget</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </BlurView>
      </Modal>
    </ScreenWrapper>
  );
}





