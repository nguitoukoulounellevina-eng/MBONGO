import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import api, { notify } from '@/app/services/api';

import { Spacing, Radius } from '@/constants/spacing';
import { fmt, dotSep } from '@/app/utils/format';
import { PageHeader } from '@/app/components/PageHeader';
import { useTheme } from '@/app/contexts/ThemeContext';
import PeriodSelector from '@/app/components/PeriodSelector';
import { usePeriod, formatMonthYear } from '@/app/services/periodService';
import { ScreenWrapper, FAB_BOTTOM } from '@/app/components/ScreenWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/app/services/ToastContext';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];



const isSameMonth = (d: string, year: number, month: number) => {
  const date = new Date(d);
  return date.getFullYear() === year && date.getMonth() === month;
};

const RED = '#E53935';

export default function Depenses() {
  const { colors: C, isDark } = useTheme();
  const period = usePeriod();
  const showToast = useToast();
  const s = useMemo(() => StyleSheet.create({
    root:{ flex:1, backgroundColor:C.bg },
    filterBtn:{ paddingHorizontal:Spacing.md, height:28, borderRadius:Radius.xl, backgroundColor:'rgba(255,255,255,0.12)', alignItems:'center', justifyContent:'center' },
    filterBtnActive:{ backgroundColor:'rgba(255,255,255,0.25)' },
    filterBtnTxt:{ fontSize:12, fontWeight:'700', color:'rgba(255,255,255,0.6)' },
    filterBtnTxtActive:{ color:C.white },
    summaryCard:{ marginHorizontal:Spacing.lg, marginTop:Spacing.xl, borderRadius:Radius.xl, backgroundColor: isDark ? C.surfaceLight : C.dark, overflow:'hidden', minHeight:60 },
    summaryContent:{ padding:Spacing.md },
    summaryTop:{ flexDirection:'row', alignItems:'center', gap:Spacing.xs, marginBottom:2 },
    summaryIconWrap:{ width:20, height:20, borderRadius:5, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center' },
    summaryIcon:{ fontSize:11 },
    summaryLbl:{ fontSize:10, fontWeight:'700', color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:0.4 },
    summaryAmountRow:{ flexDirection:'row', alignItems:'baseline', gap:Spacing.xs, marginBottom:1 },
    summaryAmount:{ fontSize:27, fontWeight:'900', color:'#FFFFFF', letterSpacing:-0.3 },
    summaryCurrency:{ fontSize:12, fontWeight:'600', color:'rgba(255,255,255,0.8)' },
    summaryMeta:{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:2 },
    summaryMonth:{ fontSize:10, color:'rgba(255,255,255,0.75)' },
    summaryCount:{ fontSize:10, color:'rgba(255,255,255,0.75)' },
    summaryEmptyCount:{ fontSize:10, color:'rgba(255,255,255,0.4)', fontStyle:'italic' },
    summaryEvoRow:{ flexDirection:'row', alignItems:'center', gap:2 },
    summaryEvoArrow:{ fontSize:11, fontWeight:'800' },
    summaryEvoTxt:{ fontSize:10, fontWeight:'800' },
    summaryEvoLabel:{ fontSize:9, color:'rgba(255,255,255,0.7)' },
    evoPositive:{ color: C.danger },
    evoNegative:{ color: C.green },
    summaryEvoPlaceholder:{ fontSize:9, color:'rgba(255,255,255,0.6)', fontStyle:'italic' },
    searchRow:{ flexDirection:'row', gap:Spacing.sm, paddingHorizontal:Spacing.lg, marginTop:Spacing.lg, marginBottom:2 },
    searchBox:{ flex:1, flexDirection:'row', alignItems:'center', backgroundColor:C.white, borderRadius:Radius.md, paddingHorizontal:Spacing.md, height:38, borderWidth:1, borderColor:C.border, shadowColor:C.dark, shadowOffset:{width:0,height:2}, shadowOpacity:0.03, shadowRadius:6, elevation:2 },
    searchIco:{ fontSize:13, marginRight:6 },
    searchInput:{ flex:1, fontSize:13, fontWeight:'500', color:C.text, height:'100%', padding:0 },
    searchClear:{ width:20, height:20, borderRadius:Radius.md, backgroundColor:C.surface, alignItems:'center', justifyContent:'center' },
    searchClearTxt:{ fontSize:11, fontWeight:'700', color:C.muted },
    searchFilterBtn:{ paddingHorizontal:Spacing.md, height:38, borderRadius:Radius.md, backgroundColor:C.white, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.border },
    searchFilterBtnActive:{ backgroundColor:RED, borderColor:RED },
    searchFilterIco:{ fontSize:11, fontWeight:'700', color:C.muted },
    searchFilterIcoActive:{ color:C.white },
    listHeader:{ fontSize:11, fontWeight:'800', color:C.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:Spacing.md, paddingHorizontal:Spacing.lg },
    item:{ flexDirection:'row', alignItems:'center', backgroundColor:C.white, marginHorizontal:Spacing.lg, marginBottom:Spacing.lg, borderRadius:Radius.lg, padding:Spacing.md, borderWidth:1, borderColor:C.border, shadowColor:C.dark, shadowOffset:{width:0,height:2}, shadowOpacity:0.03, shadowRadius:6, elevation:2 },
    itemBadge:{ width:42, height:42, borderRadius:Radius.md, alignItems:'center', justifyContent:'center' },
    itemEmoji:{ fontSize:21 },
    itemInfo:{ flex:1, marginLeft:Spacing.md },
    itemLabel:{ fontSize:15, fontWeight:'700', color:C.text, marginBottom:2 },
    itemCat:{ fontSize:11, color:C.muted },
    itemRight:{ alignItems:'flex-end' },
    itemDate:{ fontSize:10, color:C.hint, marginBottom:3 },
    itemMt:{ fontSize:15, fontWeight:'800', color:C.danger },
    empty:{ alignItems:'center', paddingVertical:Spacing.xl, paddingHorizontal:32 },
    emptyIcoWrap:{ width:46, height:46, borderRadius:23, backgroundColor:'rgba(244,63,94,0.15)', alignItems:'center', justifyContent:'center', marginBottom:6 },
    emptyIco:{ fontSize:21 },
    emptyTxt:{ fontSize:15, fontWeight:'700', color:C.text, marginBottom:3, textAlign:'center' },
    emptySub:{ fontSize:12, color:C.muted, textAlign:'center', lineHeight:Spacing.lg, marginBottom:Spacing.md },
    emptyBtn:{ backgroundColor:RED, borderRadius:Radius.md, paddingVertical:Spacing.md, paddingHorizontal:Spacing.lg, shadowColor:RED, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
    emptyBtnTxt:{ fontSize:13, fontWeight:'700', color:C.white },
    fabWrap:{ position:'absolute', right:Spacing.lg, bottom:Spacing.xl, shadowColor:RED, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.md, elevation:6 },
    fab:{ width:48, height:48, borderRadius:Radius.xl, backgroundColor:RED, alignItems:'center', justifyContent:'center' },
    fabTxt:{ fontSize:23, fontWeight:'500', color:C.white, lineHeight:24 },
    blur:{ flex:1, backgroundColor:'rgba(0,0,0,0.4)' },
    overlayActions:{ flex:1, justifyContent:'flex-end', padding:Spacing.lg },
    actionSheet:{ backgroundColor:C.white, borderRadius:Radius.xl, padding:Spacing.xl, paddingBottom:28, shadowColor:'#000', shadowOffset:{width:0,height:-4}, shadowOpacity:0.1, shadowRadius:Spacing.xl, elevation:10 },
    actionPreview:{ flexDirection:'row', alignItems:'center', gap:Spacing.md, marginBottom:Spacing.xs },
    actionBadge:{ width:44, height:44, borderRadius:Radius.md, alignItems:'center', justifyContent:'center' },
    actionEmoji:{ fontSize:21 },
    actionPreviewInfo:{ flex:1 },
    actionPreviewLabel:{ fontSize:16, fontWeight:'700', color:C.text },
    actionPreviewCat:{ fontSize:12, color:C.muted, marginTop:1 },
    actionPreviewLieu:{ fontSize:11, color:C.muted, marginTop:3 },
    actionPreviewNotes:{ fontSize:11, color:C.muted, marginTop:1 },
    actionPreviewMt:{ fontSize:17, fontWeight:'800', color:C.danger },
    actionDivider:{ height:1, backgroundColor:C.border, marginVertical:Spacing.sm },
    actionBtn:{ flexDirection:'row', alignItems:'center', gap:Spacing.md, paddingVertical:Spacing.md },
    actionBtnIco:{ fontSize:17 },
    actionBtnTxt:{ fontSize:15, fontWeight:'700', color:C.text },
    overlay:{ flexGrow:1, justifyContent:'center', alignItems:'center', padding:Spacing.xl },
    modalCard:{ backgroundColor:C.white, borderRadius:Radius.xl, padding:Spacing.xl, width:'100%', maxWidth:360, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.15, shadowRadius:Spacing.xl, elevation:16 },
    modalHeader:{ flexDirection:'row', alignItems:'flex-start', marginBottom:Spacing.lg },
    modalHeaderText:{ flex:1 },
    closeBtn:{ width:32, height:32, borderRadius:Radius.full, backgroundColor:C.surface, alignItems:'center', justifyContent:'center' },
    closeBtnTxt:{ fontSize:15, fontWeight:'600', color:C.muted },
    modalTitle:{ fontSize:21, fontWeight:'800', color:C.dark },
    modalSub:{ fontSize:12, fontWeight:'700', color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6, marginTop:Spacing.md },
    input:{ backgroundColor:C.surface, borderRadius:Radius.md, padding:Spacing.lg, fontSize:16, fontWeight:'600', color:C.dark, borderWidth:1.5, borderColor:C.border },
    inputFocused:{ borderColor:RED, borderWidth:2 },
    selectBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:C.surface, borderRadius:Radius.md, padding:Spacing.lg, borderWidth:1.5, borderColor:C.border, gap:Spacing.sm },
    selectBtnEmoji:{ fontSize:17 },
    selectBtnTxt:{ flex:1, fontSize:16, fontWeight:'600', color:C.dark },
    selectArrow:{ fontSize:11, color:C.hint },
    modalActions:{ flexDirection:'row', gap:Spacing.md, marginTop:Spacing.xl },
    btnHalf:{ flex:1, borderRadius:Radius.md },
    btnShadow:{ shadowColor:RED, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
    btnCancel:{ borderRadius:Radius.md, height:48, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:Spacing.sm, borderWidth:1.5, borderColor:C.border, backgroundColor:C.white },
    btnCancelPressed:{ borderColor:RED, backgroundColor:'#FEF2F2' },
    btnCancelTxt:{ fontSize:14, fontWeight:'700', color:C.muted },
    btnSave:{ flex:1, borderRadius:Radius.md, height:48, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:Spacing.sm, backgroundColor:RED, shadowColor:RED, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
    btnSavePressed:{ backgroundColor:'#B91C1C' },
    btnSaveTxt:{ fontSize:14, fontWeight:'700', color:C.white },
    btnSaveDisabled:{ opacity:0.6 },
    successWrap:{ alignItems:'center', paddingVertical:Spacing.xl },
    successCircle:{ width:64, height:64, borderRadius:32, backgroundColor:C.success, alignItems:'center', justifyContent:'center', marginBottom:Spacing.lg },
    successIcon:{ fontSize:29, color:C.white, fontWeight:'800' },
    successTitle:{ fontSize:21, fontWeight:'800', color:C.dark, marginBottom:Spacing.xs },
    successSubTxt:{ fontSize:13, color:C.muted, textAlign:'center', marginTop:Spacing.sm },
    successOkBtn:{ marginTop:Spacing.xl, backgroundColor:RED, borderRadius:Radius.md, paddingVertical:Spacing.md, paddingHorizontal:Spacing.xl, minWidth:120, alignItems:'center', justifyContent:'center' },
    successOkBtnTxt:{ fontSize:15, fontWeight:'800', color:C.white },
    sqRow:{ flexDirection:'row', gap:Spacing.xs, alignItems:'center' },
    sq:{ width:6, height:6, borderRadius:1.5, backgroundColor:RED },
    sqLight:{ backgroundColor:'rgba(255,255,255,0.7)' },
    dateOverlay:{ flex:1, justifyContent:'center', alignItems:'center', padding:Spacing.xl },
    dateCard:{ backgroundColor:C.white, borderRadius:Radius.xl, padding:Spacing.lg, width:'100%', maxWidth:340, alignItems:'center', shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.15, shadowRadius:Spacing.xl, elevation:16 },
    dateTitle:{ fontSize:17, fontWeight:'800', color:C.dark, marginBottom:Spacing.md },
    dateCols:{ flexDirection:'row', gap:Spacing.sm, width:'100%' },
    dateCol:{ flex:1, alignItems:'center' },
    dateColLabel:{ fontSize:11, fontWeight:'700', color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:Spacing.sm },
    dateScroll:{ maxHeight:180, width:'100%' },
    dateItem:{ paddingVertical:Spacing.sm, alignItems:'center', borderRadius:Radius.md, marginBottom:2 },
    dateItemActive:{ backgroundColor:RED },
    dateItemTxt:{ fontSize:15, fontWeight:'600', color:C.text },
    dateItemTxtActive:{ color:C.white, fontWeight:'800' },
    dateActions:{ flexDirection:'row', gap:Spacing.md, marginTop:Spacing.lg, width:'100%' },
    dateBtnCancel:{ flex:1, borderRadius:Radius.md, height:42, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:C.border, backgroundColor:C.white },
    dateBtnCancelTxt:{ fontSize:14, fontWeight:'700', color:C.muted },
    dateBtnOk:{ flex:1, borderRadius:Radius.md, height:42, alignItems:'center', justifyContent:'center', backgroundColor:C.danger, shadowColor:C.danger, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
    dateBtnOkTxt:{ fontSize:14, fontWeight:'700', color:C.white },
    dropdownOverlay:{ position:'absolute', top:0, left:0, right:0, bottom:0, justifyContent:'center', alignItems:'center' },
    dropdownCard:{ backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.sm, width:'80%', maxWidth:320, maxHeight:260, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.15, shadowRadius:Spacing.xl, elevation:16 },
    dropdownItem:{ flexDirection:'row', alignItems:'center', gap:Spacing.md, paddingVertical:Spacing.md, paddingHorizontal:Spacing.lg, borderRadius:Radius.md },
    dropdownItemEmoji:{ fontSize:19 },
    dropdownItemTxt:{ fontSize:15, fontWeight:'600', color:C.text },
  }), [C]);
  const [depenses, setDepenses] = useState<any[]>([]);
  const [comptes, setComptes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [label, setLabel] = useState('');
  const [montant, setMontant] = useState('');
  const [compteId, setCompteId] = useState<number|null>(null);
  const [showCompteDropdown, setShowCompteDropdown] = useState(false);
  const [categorieId, setCategorieId] = useState<number|null>(null);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDay, setTempDay] = useState(date.getDate());
  const [tempMonth, setTempMonth] = useState(date.getMonth());
  const [tempYear, setTempYear] = useState(date.getFullYear());
  const [lieu, setLieu] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successSub, setSuccessSub] = useState('');
  const [focusedField, setFocusedField] = useState<string|null>(null);
  const [dotButton, setDotButton] = useState<'cancel'|'save'|null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [prevMonthTotal, setPrevMonthTotal] = useState(0);

  const selectedCat = categories.find(c => c.id === categorieId);
  const hasBudget = useMemo(() => {
    if (!categorieId) return false;
    return budgets.some(b =>
      b.categorie_id === categorieId &&
      b.mois === period.month &&
      b.annee === period.year
    );
  }, [categorieId, budgets, period.month, period.year]);

  const budgetCategorieIds = useMemo(() => {
    return new Set(
      budgets
        .filter(b => b.mois === period.month && b.annee === period.year)
        .map(b => b.categorie_id)
    );
  }, [budgets, period.month, period.year]);

  const budgetForCat = useMemo(() => {
    if (!categorieId) return null;
    return budgets.find(b =>
      b.categorie_id === categorieId &&
      b.mois === period.month &&
      b.annee === period.year
    ) || null;
  }, [categorieId, budgets, period.month, period.year]);

  const firstBudgetCompteId = useMemo(() => {
    if (!budgetForCat?.comptes_allocation) return null;
    const parts = budgetForCat.comptes_allocation.split('||');
    const first = parts[0]?.split(':');
    return first ? parseInt(first[0]) : null;
  }, [budgetForCat]);

  const usageCount: Record<number,number> = {};
  depenses.forEach(r => { if (r.categorie_id) usageCount[r.categorie_id] = (usageCount[r.categorie_id]||0)+1; });
  const sortedCats = categories
    .filter((c:any) => c.type === 'depense')
    .sort((a:any, b:any) => (usageCount[b.id]||0) - (usageCount[a.id]||0) || (a.libelle||'').localeCompare(b.libelle||''));

  const { add } = useLocalSearchParams<{ add?: string }>();

  useEffect(() => {
    if (add === 'true') {
      openAdd();
    }
  }, [add]);

  useEffect(() => {
    if (hasBudget && firstBudgetCompteId) {
      setCompteId(firstBudgetCompteId);
    }
  }, [hasBudget, firstBudgetCompteId]);

  const cardEntry = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const addScale = useSharedValue(1);
  const saveScale = useSharedValue(1);
  const cancelScale = useSharedValue(1);
  const cancelDotSlide = useSharedValue(0);
  const saveDotSlide = useSharedValue(0);
  const fabScale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardEntry.value,
    transform: [
      { scale: 0.85 + cardEntry.value * 0.15 },
      { translateY: (1 - cardEntry.value) * 40 },
    ],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));
  const saveBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }] }));
  const cancelBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: cancelScale.value }] }));
  const cancelDot1 = useAnimatedStyle(() => ({ transform: [{ translateX: cancelDotSlide.value }] }));
  const cancelDot2 = useAnimatedStyle(() => ({ transform: [{ translateX: -cancelDotSlide.value }] }));
  const saveDot1 = useAnimatedStyle(() => ({ transform: [{ translateX: saveDotSlide.value }] }));
  const saveDot2 = useAnimatedStyle(() => ({ transform: [{ translateX: -saveDotSlide.value }] }));
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  const filtered = depenses.filter(r => {
    const q = searchQuery.toLowerCase();
    return !q || (r.label||'').toLowerCase().includes(q);
  });

  const monthTotal = depenses
    .reduce((a:number,r:any)=>a+Number(r.montant||r.mt||0),0);

  const evolution = prevMonthTotal > 0 ? ((monthTotal - prevMonthTotal) / prevMonthTotal * 100).toFixed(1) : null;

  const load = async () => {
    setLoading(true);
    try {
      const prevM = period.month === 1 ? 12 : period.month - 1;
      const prevY = period.month === 1 ? period.year - 1 : period.year;
      const [res, resPrev, comp, catRes, budRes] = await Promise.all([
        api.depenses.list({ debut: period.current.debut, fin: period.current.fin }),
        api.depenses.list({ mois: prevM, annee: prevY }),
        api.comptes.list(), api.categories.list(), api.budgets.list()
      ]);
      const list = (Array.isArray(res) ? res : []).map((d:any) => ({
        ...d,
        label: d.libelle || d.label,
        date: d.date_depense || d.date,
      }));
      setDepenses(list);
      const prevList = Array.isArray(resPrev) ? resPrev : [];
      setPrevMonthTotal(prevList.reduce((a:number,r:any)=>a+Number(r.montant||r.mt||0),0));
      const clist = Array.isArray(comp) ? comp : [];
      setComptes(clist);
      if (clist.length > 0 && !compteId) setCompteId(clist[0].id);
      const allCats = Array.isArray(catRes) ? catRes : [];
      setCategories(allCats.filter((c:any) => c.type === 'depense'));
      setBudgets(Array.isArray(budRes) ? budRes : []);
    } catch (e:any) {
      console.warn('⚠️ Erreur chargement données:', e?.message);
    }
    setLoading(false);
  };

  useEffect(()=>{ load(); period.loadAvailablePeriods(); },[period.type, period.current.debut, period.current.fin]);

  useEffect(()=>{
    if (showModal) {
      cardEntry.value = withSpring(1,{damping:22,stiffness:300});
      checkScale.value = 0;
      setSuccess(false);
    } else {
      cardEntry.value = 0;
      cancelDotSlide.value = 0;
      saveDotSlide.value = 0;
      setDotButton(null);
      setEditing(null);
    }
  },[showModal]);

  const openAdd = () => {
    setEditing(null);
    setLabel('');
    setMontant('');
    setCompteId(comptes.length > 0 ? comptes[0].id : null);
    setCategorieId(categories.length > 0 ? categories[0].id : null);
    setDate(new Date());
    setLieu('');
    setNotes('');
    setShowModal(true);
  };

  const openEdit = (r:any) => {
    setShowActions(false);
    setTimeout(() => {
      setEditing(r);
      setLabel(r.libelle||r.label||'');
      setMontant(String(r.montant||r.mt||''));
      setCompteId(r.compte_id||(comptes.length>0?comptes[0].id:null));
      setCategorieId(r.categorie_id||(categories.length>0?categories[0].id:null));
      setDate(r.date ? new Date(r.date) : new Date());
      setLieu(r.lieu||'');
      setNotes(r.notes||'');
      setShowModal(true);
    }, 200);
  };

  const handleSave = async () => {
    if (!label.trim()) { Alert.alert('Erreur','Le libellé est requis'); return; }
    const mt = parseInt(montant);
    if (!mt||mt<=0) { Alert.alert('Erreur','Montant invalide'); return; }
    if (!categorieId) { Alert.alert('Erreur','Sélectionnez une catégorie'); return; }
    const effectiveCompteId = compteId || (comptes.length > 0 ? comptes[0].id : null);
    if (!hasBudget && !effectiveCompteId) { Alert.alert('Erreur','Sélectionnez un compte'); return; }
    if (!hasBudget && effectiveCompteId) {
      const compte = comptes.find(c => c.id === effectiveCompteId);
      if (compte && ['momo','especes','autre'].includes(compte.type_compte)) {
        let soldeDispo = parseFloat(compte.solde_actuel || 0);
        if (editing && editing.compte_id === effectiveCompteId) {
          soldeDispo += parseFloat(editing.montant || editing.mt || 0);
        }
        if (soldeDispo < mt) {
          Alert.alert('Solde insuffisant', `Ce compte ne peut pas être à découvert. Solde disponible : ${fmt(soldeDispo)}`);
          return;
        }
      }
    }
    setSaving(true);
    const data: any = { libelle: label.trim(), montant: mt, categorie_id: categorieId, date_depense: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, lieu: lieu.trim()||null, notes: notes.trim()||null, compte_id: effectiveCompteId };
    try {
      if (editing) await api.depenses.update(editing.id, data);
      else await api.depenses.create(data);
      setSaving(false);
      await new Promise(r => setTimeout(r, 400));
      const compteNom = comptes.find(c => c.id === effectiveCompteId)?.nom_compte || 'votre compte';
      const sourceMsg = hasBudget ? `Montant prélevé du budget` : `Montant déduit de ${compteNom}`;
      setSuccessSub(sourceMsg);
      setSuccess(true);
      checkScale.value = withSpring(1,{damping:8,stiffness:150});
      showToast({ type: 'success', titre: editing ? 'Dépense modifiée' : 'Dépense ajoutée', message: `${label.trim()} · ${fmt(mt)}`, icone: '💸' });
      notify('success', editing ? 'Dépense modifiée' : 'Dépense ajoutée', `${label.trim()} · ${fmt(mt)}`);
      load();
    } catch (e:any) {
      if (e.status === 409 && e.data?.warning) {
        setSaving(false);
        setDotButton(null);
        cancelDotSlide.value = withTiming(0);
        saveDotSlide.value = withTiming(0);
        Alert.alert(
          'Dépassement budget',
          e.data.message,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Confirmer',
              onPress: async () => {
                setSaving(true);
                try {
                  data.confirmed = true;
                  if (editing) await api.depenses.update(editing.id, data);
                  else await api.depenses.create(data);
                  setSaving(false);
                  await new Promise(r => setTimeout(r, 400));
                  setSuccessSub(`Dépassement couvert : ${e.data.depassement?.toLocaleString()} FCFA déduits de ${e.data.compte_nom || 'votre compte'}`);
                  setSuccess(true);
                  checkScale.value = withSpring(1,{damping:8,stiffness:150});
                  load();
                } catch (e2: any) {
                  setSaving(false);
                  Alert.alert('Erreur', e2.message || 'Impossible d\'enregistrer');
                }
              },
            },
          ]
        );
        return;
      }
      setSaving(false);
      cancelDotSlide.value = withTiming(0);
      saveDotSlide.value = withTiming(0);
      setDotButton(null);
      Alert.alert('Erreur',e.message||'Impossible d\'enregistrer');
    }
  };

  const handleSuccessClose = () => {
    setShowModal(false);
    setSuccess(false);
    setSuccessSub('');
    load();
  };

  const handleDelete = (r:any) => {
    console.log('🗑 handleDelete appelé pour :', r?.id, r?.label);
    setShowActions(false);
    Alert.alert('Supprimer',`Supprimer « ${r.label || r.libelle} » ?`,[
      { text:'Annuler', style:'cancel' },
      { text:'Confirmer', style:'destructive', onPress:async()=>{
          try {
            console.log('🟡 Suppression API depenses.remove id:', r.id);
            const result = await api.depenses.remove(r.id);
            console.log('🟢 Suppression réussie :', result);
            showToast({ type: 'info', titre: 'Dépense supprimée', message: `${r.label || r.libelle}`, icone: '🗑️' });
            notify('info', 'Dépense supprimée', `${r.label || r.libelle}`);
            load();
        } catch(e:any){
          console.log('🔴 Erreur suppression dépense :', e.message);
          Alert.alert('Erreur',e.message||'Impossible de supprimer');
        }
      }},
    ]);
  };

  const openActions = (r:any) => {
    setSelected(r);
    setShowActions(true);
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <ScreenWrapper style={s.root}>
      <StatusBar style="light" />

      <PageHeader
        title="Dépenses"
        icon="💳"
        backRoute="/transactions"
        color={C.dark}
      />

      <ScrollView
        style={{ flex:1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Carte résumé ──────────────── */}
        <View style={s.summaryCard}>
          <View style={s.summaryContent}>
            <View style={s.summaryTop}>
              <View style={s.summaryIconWrap}>
                <Text style={s.summaryIcon}>💸</Text>
              </View>
              <Text style={s.summaryLbl}>Total des dépenses</Text>
            </View>
            <View style={s.summaryAmountRow}>
              <Text style={s.summaryAmount}>{dotSep(Math.round(monthTotal || 0))}</Text>
              <Text style={s.summaryCurrency}>FCFA</Text>
            </View>
            <View style={s.summaryMeta}>
              <Text style={s.summaryMonth}>
                {formatMonthYear(period.month, period.year)}
              </Text>
              {depenses.length === 0 ? (
                <Text style={s.summaryEmptyCount}>Aucune dépense enregistrée</Text>
              ) : (
                <Text style={s.summaryCount}>{filtered.length} dépense{filtered.length > 1 ? 's' : ''}</Text>
              )}
            </View>
            {evolution !== null ? (
              <View style={s.summaryEvoRow}>
                <Ionicons name={parseFloat(evolution) >= 0 ? 'arrow-up' : 'arrow-down'} size={11} color={parseFloat(evolution) >= 0 ? C.green : C.danger} />
                <Text style={[s.summaryEvoTxt, parseFloat(evolution) >= 0 ? s.evoPositive : s.evoNegative]}>
                  {Math.abs(parseFloat(evolution)).toFixed(1)}%
                </Text>
                <Text style={s.summaryEvoLabel}> vs mois précédent</Text>
              </View>
            ) : depenses.length === 0 ? (
              <Text style={s.summaryEvoPlaceholder}>Ajoutez votre première dépense</Text>
            ) : (
              <Text style={s.summaryEvoPlaceholder}>Aucune donnée le mois précédent</Text>
            )}
          </View>
        </View>

        {/* ── Sélecteur période ────────── */}
        <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.xs }}>
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
        </View>

        {/* ── Barre recherche ───────────── */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Text style={s.searchIco}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Rechercher une dépense..."
              placeholderTextColor={C.hint}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={()=>setSearchQuery('')} style={s.searchClear} activeOpacity={0.7}>
                <Text style={s.searchClearTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Empty / Liste ─────────────── */}
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcoWrap}>
              <Text style={s.emptyIco}>💸</Text>
            </View>
            <Text style={s.emptyTxt}>
              {searchQuery ? 'Aucun résultat trouvé' : 'Aucune dépense enregistrée'}
            </Text>
            <Text style={s.emptySub}>
              {searchQuery
                ? 'Essayez de modifier vos critères de recherche'
                : 'Commencez par ajouter votre première dépense'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={s.emptyBtn} onPress={openAdd} activeOpacity={0.8}>
                <Text style={s.emptyBtnTxt}>+ Ajouter une dépense</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Text style={s.listHeader}>
              {filtered.length} dépense{filtered.length > 1 ? 's' : ''}
            </Text>
            {filtered.map((r,i) => (
              <TouchableOpacity
                key={r.id||i}
                style={s.item}
                onPress={()=>openActions(r)}
                activeOpacity={0.85}
              >
                <View style={[s.itemBadge, { backgroundColor: 'rgba(244,63,94,0.15)' }]}>
                  <Text style={s.itemEmoji}>💸</Text>
                </View>
                <View style={s.itemInfo}>
                  <Text style={s.itemLabel}>{r.label}</Text>
                  <Text style={s.itemCat}>{budgetCategorieIds.has(r.categorie_id) ? 'Depuis le budget' : (r.nom_compte || '')}</Text>
                </View>
                <View style={s.itemRight}>
                  <Text style={s.itemDate}>{formatDate(r.date)}</Text>
                  <Text style={s.itemMt}>{fmt(r.montant||r.mt)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* ── FAB ──────────────────────────── */}
      {depenses.length > 0 && (
        <Animated.View style={[s.fabWrap, fabStyle, { bottom: FAB_BOTTOM }]}>
          <TouchableOpacity
            style={s.fab}
            onPress={openAdd}
            onPressIn={()=>fabScale.value=withSpring(0.88)}
            onPressOut={()=>fabScale.value=withSpring(1)}
            activeOpacity={0.9}
          >
            <Text style={s.fabTxt}>+</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Action Sheet ─────────────────── */}
      <Modal visible={showActions} transparent animationType="none" onRequestClose={()=>setShowActions(false)}>
        <View style={s.blur}>
          <Pressable style={s.overlayActions} onPress={()=>setShowActions(false)}>
            <Pressable onPress={()=>{}} style={s.actionSheet}>
              {selected && (
                <>
                  <View style={s.actionPreview}>
                    <View style={[s.actionBadge, { backgroundColor: 'rgba(244,63,94,0.15)' }]}>
                      <Text style={s.actionEmoji}>💸</Text>
                    </View>
                    <View style={s.actionPreviewInfo}>
                      <Text style={s.actionPreviewLabel}>{selected.label}</Text>
                      <Text style={s.actionPreviewCat}>{budgetCategorieIds.has(selected.categorie_id) ? 'Depuis le budget' : (selected.nom_compte || '')}</Text>
                      {selected.lieu ? <Text style={s.actionPreviewLieu}>📍 {selected.lieu}</Text> : null}
                      {selected.notes ? <Text style={s.actionPreviewNotes}>📝 {selected.notes}</Text> : null}
                    </View>
                    <Text style={s.actionPreviewMt}>{fmt(selected.montant||selected.mt)}</Text>
                  </View>
                  <View style={s.actionDivider} />
                  <TouchableOpacity style={s.actionBtn} onPress={()=>openEdit(selected)} activeOpacity={0.7}>
                    <Text style={s.actionBtnIco}>✏️</Text>
                    <Text style={s.actionBtnTxt}>Modifier</Text>
                  </TouchableOpacity>
                  <View style={s.actionDivider} />
                  <TouchableOpacity style={s.actionBtn} onPress={()=>handleDelete(selected)} activeOpacity={0.7}>
                    <Text style={s.actionBtnIco}>🗑</Text>
                    <Text style={[s.actionBtnTxt, { color: C.danger }]}>Supprimer</Text>
                  </TouchableOpacity>
                </>
              )}
            </Pressable>
          </Pressable>
        </View>
      </Modal>

      {/* ── Modal Add/Edit ──────────────── */}
      <Modal visible={showModal} transparent animationType="none" onRequestClose={()=>setShowModal(false)}>
        <View style={s.blur}>
          <ScrollView contentContainerStyle={s.overlay} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => Keyboard.dismiss()} style={{ width: '100%' }}>
            <Animated.View style={[s.modalCard, cardStyle]}>
              {success ? (
                <View style={s.successWrap}>
                  <Animated.View style={[s.successCircle, checkStyle]}>
                    <Text style={s.successIcon}>✓</Text>
                  </Animated.View>
                  <Text style={s.successTitle}>Dépense {editing?'modifiée':'ajoutée'} !</Text>
                  {successSub ? <Text style={s.successSubTxt}>{successSub}</Text> : null}
                  <TouchableOpacity style={s.successOkBtn} onPress={handleSuccessClose} activeOpacity={0.85}>
                    <Text style={s.successOkBtnTxt}>OK</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={s.modalHeader}>
                    <View style={s.modalHeaderText}>
                      <Text style={s.modalTitle}>{editing?'Modifier':'Nouvelle'} dépense</Text>
                    </View>
                    <Pressable onPress={()=>setTimeout(()=>setShowModal(false),600)} style={s.closeBtn} hitSlop={8}>
                      <Text style={s.closeBtnTxt}>✕</Text>
                    </Pressable>
                  </View>

                  <Text style={s.modalSub}>Libellé</Text>
                  <TextInput
                    style={[s.input,focusedField==='label'&&s.inputFocused]}
                    value={label} onChangeText={setLabel}
                    placeholder="Ex: Courses" placeholderTextColor={C.hint}
                    onFocus={()=>setFocusedField('label')} onBlur={()=>setFocusedField(null)}
                  />

                  <Text style={s.modalSub}>Montant (FCFA)</Text>
                  <TextInput
                    style={[s.input,focusedField==='mt'&&s.inputFocused]}
                    value={montant} onChangeText={setMontant}
                    placeholder="Ex: 25000" placeholderTextColor={C.hint}
                    keyboardType="numeric"
                    onFocus={()=>setFocusedField('mt')} onBlur={()=>setFocusedField(null)}
                  />

                  <Text style={s.modalSub}>Catégorie *</Text>
                  <TouchableOpacity style={s.selectBtn} onPress={()=>setShowCatDropdown(true)} activeOpacity={0.7}>
                    <Text style={s.selectBtnEmoji}>{selectedCat?.icone||selectedCat?.emoji||'📁'}</Text>
                    <Text style={[s.selectBtnTxt, !selectedCat&&{color:C.hint}]}>
                      {selectedCat?.libelle||selectedCat?.nom||'Sélectionner une catégorie'}
                    </Text>
                    <Ionicons name="chevron-down" size={11} color={C.hint} />
                  </TouchableOpacity>

                  {!hasBudget && (
                    <>
                      <Text style={s.modalSub}>Compte *</Text>
                      <TouchableOpacity style={s.selectBtn} onPress={()=>setShowCompteDropdown(true)} activeOpacity={0.7}>
                        <Text style={s.selectBtnTxt}>
                          {comptes.find((c:any)=>c.id===compteId)?.nom_compte || 'Sélectionner un compte'}
                        </Text>
                        <Ionicons name="chevron-down" size={11} color={C.hint} />
                      </TouchableOpacity>
                    </>
                  )}

                  <Text style={s.modalSub}>Date *</Text>
                  <TouchableOpacity style={s.selectBtn} onPress={()=>{setTempDay(date.getDate());setTempMonth(date.getMonth());setTempYear(date.getFullYear());setShowDateModal(true);}} activeOpacity={0.7}>
                    <Text style={s.selectBtnTxt}>{`${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`}</Text>
                    <Ionicons name="chevron-down" size={11} color={C.hint} />
                  </TouchableOpacity>

                  <Text style={s.modalSub}>Lieu (optionnel)</Text>
                  <TextInput
                    style={[s.input,focusedField==='lieu'&&s.inputFocused]}
                    value={lieu} onChangeText={setLieu}
                    placeholder="Ex: Supermarché Casino"
                    placeholderTextColor={C.hint}
                    onFocus={()=>setFocusedField('lieu')} onBlur={()=>setFocusedField(null)}
                  />

                  <Text style={s.modalSub}>Note (optionnel)</Text>
                  <TextInput
                    style={[s.input,focusedField==='notes'&&s.inputFocused,{minHeight:60}]}
                    value={notes} onChangeText={setNotes}
                    placeholder="Ex: Paiement en espèces"
                    placeholderTextColor={C.hint}
                    multiline numberOfLines={2}
                    onFocus={()=>setFocusedField('notes')} onBlur={()=>setFocusedField(null)}
                  />

                  <View style={s.modalActions}>
                    <Animated.View style={[s.btnHalf]}>
                      <Pressable
                        style={({pressed})=>[s.btnCancel,pressed&&s.btnCancelPressed]}
                        onPress={()=>setTimeout(()=>setShowModal(false),600)}
                        onPressIn={()=>{
                          setDotButton('cancel');
                          cancelDotSlide.value = withRepeat(
                            withTiming(8,{duration:500,easing:Easing.inOut(Easing.sin)}),
                            -1,true
                          );
                        }}
                      >
                        {dotButton==='cancel' && (
                          <View style={s.sqRow}>
                            <Animated.View style={[s.sq, cancelDot1]} />
                            <Animated.View style={[s.sq, cancelDot2]} />
                          </View>
                        )}
                        <Text style={s.btnCancelTxt}>Annuler</Text>
                      </Pressable>
                    </Animated.View>
                    <Pressable
                      style={({pressed})=>[s.btnSave,pressed&&s.btnSavePressed,saving&&s.btnSaveDisabled]}
                      onPress={handleSave}
                      onPressIn={()=>{
                        setDotButton('save');
                        saveDotSlide.value = withRepeat(
                          withTiming(8,{duration:500,easing:Easing.inOut(Easing.sin)}),
                          -1,true
                        );
                      }}
                    >
                      {saving ? <ActivityIndicator color={C.white} size="small" /> : (
                        <>
                          {dotButton==='save' && (
                            <View style={s.sqRow}>
                              <Animated.View style={[s.sq, s.sqLight, saveDot1]} />
                              <Animated.View style={[s.sq, s.sqLight, saveDot2]} />
                            </View>
                          )}
                          <Text style={s.btnSaveTxt}>Enregistrer</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </>
              )}
            </Animated.View>
            </Pressable>
          </ScrollView>
          {!hasBudget && showCompteDropdown && (
            <View style={s.dropdownOverlay}>
              <Pressable style={{flex:1}} onPress={()=>setShowCompteDropdown(false)} />
              <View style={s.dropdownCard}>
                <ScrollView style={{maxHeight:200}}>
                  {comptes.map((c:any)=>(
                    <Pressable
                      key={c.id}
                      style={[s.dropdownItem, compteId===c.id&&{backgroundColor:C.surface}]}
                      onPress={()=>{setCompteId(c.id);setShowCompteDropdown(false);}}
                    >
                      <Text style={[s.dropdownItemTxt, compteId===c.id&&{fontWeight:'700',color:C.danger}]}>{c.nom_compte}</Text>
                      {compteId===c.id && <Text style={{marginLeft:'auto',color:C.danger,fontWeight:'700'}}>✓</Text>}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <Pressable style={{flex:1}} onPress={()=>setShowCompteDropdown(false)} />
            </View>
          )}
          {showCatDropdown && (
            <View style={s.dropdownOverlay}>
              <Pressable style={{flex:1}} onPress={()=>setShowCatDropdown(false)} />
              <View style={s.dropdownCard}>
                <ScrollView style={{maxHeight:240}}>
                  {sortedCats.map((c:any)=>(
                    <Pressable
                      key={c.id}
                      style={[s.dropdownItem, categorieId===c.id&&{backgroundColor:'#D1FAE5'}]}
                      onPress={()=>{setCategorieId(c.id);setShowCatDropdown(false);}}
                    >
                      <Text style={s.dropdownItemEmoji}>{c.icone||c.emoji||'📁'}</Text>
                      <Text style={[s.dropdownItemTxt, categorieId===c.id&&{fontWeight:'700',color:C.danger}]}>{c.libelle||c.nom}</Text>
                      {categorieId===c.id && <Text style={{marginLeft:'auto',color:C.danger,fontWeight:'700'}}>✓</Text>}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <Pressable style={{flex:1}} onPress={()=>setShowCatDropdown(false)} />
            </View>
          )}
        </View>
      </Modal>

      {/* ── Date picker modal ──────────────── */}
      <Modal visible={showDateModal} transparent animationType="none" onRequestClose={()=>setShowDateModal(false)}>
        <View style={s.blur}>
          <Pressable style={s.dateOverlay} onPress={()=>setShowDateModal(false)}>
            <Pressable style={s.dateCard} onPress={e=>e.stopPropagation()}>
              <Text style={s.dateTitle}>Choisir une date</Text>
              <View style={s.dateCols}>
                <View style={s.dateCol}>
                  <Text style={s.dateColLabel}>Jour</Text>
                  <ScrollView style={s.dateScroll} showsVerticalScrollIndicator={false}>
                    {Array.from({length:31},(_,i)=>i+1).map(d=>(
                      <TouchableOpacity
                        key={d}
                        style={[s.dateItem, tempDay===d&&s.dateItemActive]}
                        onPress={()=>setTempDay(d)}
                      >
                        <Text style={[s.dateItemTxt, tempDay===d&&s.dateItemTxtActive]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={s.dateCol}>
                  <Text style={s.dateColLabel}>Mois</Text>
                  <ScrollView style={s.dateScroll} showsVerticalScrollIndicator={false}>
                    {MONTHS.map((m,i)=>(
                      <TouchableOpacity
                        key={i}
                        style={[s.dateItem, tempMonth===i&&s.dateItemActive]}
                        onPress={()=>setTempMonth(i)}
                      >
                        <Text style={[s.dateItemTxt, tempMonth===i&&s.dateItemTxtActive]}>{m.substring(0,3)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={s.dateCol}>
                  <Text style={s.dateColLabel}>Année</Text>
                  <ScrollView style={s.dateScroll} showsVerticalScrollIndicator={false}>
                    {Array.from({length:21},(_,i)=>2020+i).map(y=>(
                      <TouchableOpacity
                        key={y}
                        style={[s.dateItem, tempYear===y&&s.dateItemActive]}
                        onPress={()=>setTempYear(y)}
                      >
                        <Text style={[s.dateItemTxt, tempYear===y&&s.dateItemTxtActive]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <View style={s.dateActions}>
                <TouchableOpacity style={s.dateBtnCancel} onPress={()=>setShowDateModal(false)} activeOpacity={0.7}>
                  <Text style={s.dateBtnCancelTxt}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.dateBtnOk} onPress={()=>{setDate(new Date(tempYear,tempMonth,tempDay));setShowDateModal(false);}} activeOpacity={0.8}>
                  <Text style={s.dateBtnOkTxt}>Confirmer</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}




