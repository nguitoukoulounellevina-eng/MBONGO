import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import api from '@/app/services/api';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Spacing, Radius } from '@/constants/spacing';
import { fmt, dotSep } from '@/app/utils/format';
import { PageHeader } from '@/app/components/PageHeader';

import { useTheme } from '@/app/contexts/ThemeContext';
import PeriodSelector from '@/app/components/PeriodSelector';
import { usePeriod, formatMonthYear } from '@/app/services/periodService';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, FAB_BOTTOM } from '@/app/components/ScreenWrapper';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const isSameMonth = (d: string, year: number, month: number) => {
  const date = new Date(d);
  return date.getFullYear() === year && date.getMonth() === month;
};

export default function Revenus() {
  const { colors: C } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    root:{ flex:1, backgroundColor:C.bg },
    filterBtn:{ paddingHorizontal:Spacing.md, height:28, borderRadius:Radius.xl, backgroundColor:'rgba(255,255,255,0.12)', alignItems:'center', justifyContent:'center' },
    filterBtnActive:{ backgroundColor:'rgba(255,255,255,0.25)' },
    filterBtnTxt:{ fontSize:12, fontWeight:'700', color:'rgba(255,255,255,0.6)' },
    filterBtnTxtActive:{ color:C.white },
    summaryCard:{ marginHorizontal:Spacing.lg, marginTop:Spacing.xl, borderRadius:Radius.xl, backgroundColor:C.cardGreen, overflow:'hidden', minHeight:60 },
    summaryContent:{ padding:Spacing.md },
    summaryTop:{ flexDirection:'row', alignItems:'center', gap:Spacing.xs, marginBottom:2 },
    summaryIconWrap:{ width:20, height:20, borderRadius:5, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center' },
    summaryIcon:{ fontSize:11 },
    summaryLbl:{ fontSize:10, fontWeight:'700', color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:0.4 },
    summaryAmountRow:{ flexDirection:'row', alignItems:'baseline', gap:Spacing.xs, marginBottom:1 },
    summaryAmount:{ fontSize:27, fontWeight:'900', color:C.white, letterSpacing:-0.3 },
    summaryCurrency:{ fontSize:12, fontWeight:'600', color:'rgba(255,255,255,0.5)' },
    summaryMeta:{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:2 },
    summaryMonth:{ fontSize:10, color:'rgba(255,255,255,0.5)' },
    summaryCount:{ fontSize:10, color:'rgba(255,255,255,0.5)' },
    summaryEmptyCount:{ fontSize:10, color:'rgba(255,255,255,0.4)', fontStyle:'italic' },
    summaryEvoRow:{ flexDirection:'row', alignItems:'center', gap:2 },
    summaryEvoArrow:{ fontSize:11, fontWeight:'800' },
    summaryEvoTxt:{ fontSize:10, fontWeight:'800' },
    summaryEvoLabel:{ fontSize:9, color:'rgba(255,255,255,0.5)' },
    evoPositive:{ color: C.green },
    evoNegative:{ color: C.danger },
    summaryEvoPlaceholder:{ fontSize:9, color:'rgba(255,255,255,0.4)', fontStyle:'italic' },
    searchRow:{ flexDirection:'row', gap:Spacing.sm, paddingHorizontal:Spacing.lg, marginTop:Spacing.lg, marginBottom:2 },
    searchBox:{ flex:1, flexDirection:'row', alignItems:'center', backgroundColor:C.white, borderRadius:Radius.md, paddingHorizontal:Spacing.md, height:38, borderWidth:1, borderColor:C.border, shadowColor:C.dark, shadowOffset:{width:0,height:2}, shadowOpacity:0.03, shadowRadius:6, elevation:2 },
    searchIco:{ fontSize:13, marginRight:6 },
    searchInput:{ flex:1, fontSize:13, fontWeight:'500', color:C.text, height:'100%', padding:0 },
    searchClear:{ width:20, height:20, borderRadius:Radius.md, backgroundColor:C.surface, alignItems:'center', justifyContent:'center' },
    searchClearTxt:{ fontSize:11, fontWeight:'700', color:C.muted },
    searchFilterBtn:{ paddingHorizontal:Spacing.md, height:38, borderRadius:Radius.md, backgroundColor:C.white, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:C.border },
    searchFilterBtnActive:{ backgroundColor:C.cardGreen, borderColor:C.cardGreen },
    searchFilterIco:{ fontSize:11, fontWeight:'700', color:C.muted },
    searchFilterIcoActive:{ color:C.white },
    listHeader:{ fontSize:11, fontWeight:'800', color:C.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:Spacing.md, paddingHorizontal:Spacing.lg },
    item:{ flexDirection:'row', alignItems:'center', backgroundColor:C.white, marginHorizontal:Spacing.lg, marginBottom:Spacing.lg, borderRadius:Radius.lg, padding:Spacing.md, borderWidth:1, borderColor:C.border, shadowColor:C.dark, shadowOffset:{width:0,height:2}, shadowOpacity:0.03, shadowRadius:6, elevation:2 },
    itemBadge:{ width:42, height:42, borderRadius:Radius.md, alignItems:'center', justifyContent:'center' },
    itemEmoji:{ fontSize:21 },
    itemInfo:{ flex:1, marginLeft:Spacing.md },
    itemLabel:{ fontSize:15, fontWeight:'700', color:C.text, marginBottom:2 },
    itemCat:{ fontSize:11, color:C.muted },
    itemAccount:{ fontSize:10, color:C.hint, marginTop:1 },
    itemRight:{ alignItems:'flex-end' },
    itemDate:{ fontSize:10, color:C.hint, marginBottom:3 },
    itemMt:{ fontSize:15, fontWeight:'800', color:C.green },
    empty:{ alignItems:'center', paddingVertical:Spacing.xl, paddingHorizontal:32 },
    emptyIcoWrap:{ width:46, height:46, borderRadius:23, backgroundColor:'rgba(34,197,94,0.15)', alignItems:'center', justifyContent:'center', marginBottom:6 },
    emptyIco:{ fontSize:21 },
    emptyTxt:{ fontSize:15, fontWeight:'700', color:C.text, marginBottom:3, textAlign:'center' },
    emptySub:{ fontSize:12, color:C.muted, textAlign:'center', lineHeight:Spacing.lg, marginBottom:Spacing.md },
    emptyBtn:{ backgroundColor:C.cardGreen, borderRadius:Radius.md, paddingVertical:Spacing.md, paddingHorizontal:Spacing.lg, shadowColor:C.cardGreen, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
    emptyBtnTxt:{ fontSize:13, fontWeight:'700', color:C.white },
    fabWrap:{ position:'absolute', right:Spacing.lg, bottom:Spacing.xl, shadowColor:C.cardGreen, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.md, elevation:6 },
    fab:{ width:48, height:48, borderRadius:Radius.xl, backgroundColor:C.cardGreen, alignItems:'center', justifyContent:'center' },
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
    actionPreviewAccount:{ fontSize:11, color:C.hint, marginTop:1 },
    actionPreviewMt:{ fontSize:17, fontWeight:'800', color:C.green },
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
    modalSub:{ fontSize:12, fontWeight:'700', color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:Spacing.xs, marginTop:Spacing.sm },
    input:{ backgroundColor:C.surface, borderRadius:Radius.md, padding:Spacing.md, fontSize:16, fontWeight:'600', color:C.dark, borderWidth:1.5, borderColor:C.border },
    inputFocused:{ borderColor:C.cardGreen, borderWidth:2 },
    selectBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:C.surface, borderRadius:Radius.md, padding:Spacing.md, borderWidth:1.5, borderColor:C.border, gap:Spacing.sm },
    selectBtnEmoji:{ fontSize:17 },
    selectBtnTxt:{ flex:1, fontSize:16, fontWeight:'600', color:C.text },
    selectArrow:{ fontSize:11, color:C.muted },
    dropdownOverlay:{ position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:100, backgroundColor:'rgba(0,0,0,0.15)' },
    dropdownCard:{ alignSelf:'center', width:'85%', maxWidth:360, backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.sm, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.15, shadowRadius:Spacing.xl, elevation:16, borderWidth:1, borderColor:C.border },
    dropdownItem:{ flexDirection:'row', alignItems:'center', gap:Spacing.md, paddingVertical:Spacing.md, paddingHorizontal:Spacing.md, borderRadius:Radius.md },
    dropdownItemEmoji:{ fontSize:19 },
    dropdownItemTxt:{ fontSize:16, fontWeight:'500', color:C.text },
    modalActions:{ flexDirection:'row', gap:Spacing.md, marginTop:Spacing.xl },
    btnHalf:{ flex:1, borderRadius:Radius.md },
    btnShadow:{ shadowColor:C.cardGreen, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
    btnCancel:{ borderRadius:Radius.md, height:48, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:Spacing.sm, borderWidth:1.5, borderColor:C.border, backgroundColor:C.white },
    btnCancelPressed:{ borderColor:C.cardGreen, backgroundColor:'#ECFDF5' },
    btnCancelTxt:{ fontSize:14, fontWeight:'700', color:C.muted },
    btnSave:{ flex:1, borderRadius:Radius.md, height:48, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:Spacing.sm, backgroundColor:C.cardGreen, shadowColor:C.cardGreen, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
    btnSavePressed:{ backgroundColor: C.cardGreen, opacity:0.85 },
    btnSaveTxt:{ fontSize:14, fontWeight:'700', color:C.white },
    btnSaveDisabled:{ opacity:0.6 },
    successWrap:{ alignItems:'center', paddingVertical:Spacing.xl },
    successCircle:{ width:64, height:64, borderRadius:32, backgroundColor:C.success, alignItems:'center', justifyContent:'center', marginBottom:Spacing.lg },
    successIcon:{ fontSize:29, color:C.white, fontWeight:'800' },
    successTitle:{ fontSize:21, fontWeight:'800', color:C.dark, marginBottom:Spacing.xs },
    successSubTxt:{ fontSize:13, color:C.muted, textAlign:'center', marginTop:Spacing.sm },
    successOkBtn:{ marginTop:Spacing.xl, backgroundColor:C.cardGreen, borderRadius:Radius.md, paddingVertical:Spacing.md, paddingHorizontal:Spacing.xl, minWidth:120, alignItems:'center', justifyContent:'center' },
    successOkBtnTxt:{ fontSize:15, fontWeight:'800', color:C.white },
    sqRow:{ flexDirection:'row', gap:Spacing.xs, alignItems:'center' },
    sq:{ width:6, height:6, borderRadius:1.5, backgroundColor:C.cardGreen },
    sqLight:{ backgroundColor:'rgba(255,255,255,0.7)' },
  }), [C]);
  const period = usePeriod();

  const [revenus, setRevenus] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [catsMap, setCatsMap] = useState<Record<number,any>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [label, setLabel] = useState('');
  const [montant, setMontant] = useState('');
  const [categorieId, setCategorieId] = useState<number|null>(null);
  const [date, setDate] = useState(new Date());
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [comptes, setComptes] = useState<any[]>([]);
  const [compteId, setCompteId] = useState<number|null>(null);
  const [showCompteDropdown, setShowCompteDropdown] = useState(false);
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

  const usageCount: Record<number,number> = {};
  revenus.forEach(r => { if (r.categorie_id) usageCount[r.categorie_id] = (usageCount[r.categorie_id]||0)+1; });
  const sortedCats = categories
    .filter((c:any) => c.type === 'revenu')
    .sort((a:any, b:any) => (usageCount[b.id]||0) - (usageCount[a.id]||0) || (a.libelle||'').localeCompare(b.libelle||''));

  const { add } = useLocalSearchParams<{ add?: string }>();

  useEffect(() => {
    if (add === 'true') {
      openAdd();
    }
  }, [add]);

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

  const filtered = revenus.filter(r => {
    const q = searchQuery.toLowerCase();
    return !q || (r.libelle||r.label||'').toLowerCase().includes(q);
  });

  const monthTotal = revenus
    .reduce((a:number,r:any)=>a+Number(r.montant||r.mt||0),0);

  const evolution = prevMonthTotal > 0 ? ((monthTotal - prevMonthTotal) / prevMonthTotal * 100).toFixed(1) : null;

  const load = async () => {
    setLoading(true);
    try {
      const prevM = period.month === 1 ? 12 : period.month - 1;
      const prevY = period.month === 1 ? period.year - 1 : period.year;
      const [revs, revsPrev, cats, comp] = await Promise.all([
        api.revenus.list({ debut: period.current.debut, fin: period.current.fin }),
        api.revenus.list({ mois: prevM, annee: prevY }),
        api.categories.list(), api.comptes.list()
      ]);
      let list = Array.isArray(cats) ? cats : ((cats as any)?.data || (cats as any)?.categories || []);
      setRevenus((Array.isArray(revs)?revs:[]).map((d:any) => ({
        ...d,
        label: d.libelle || d.label,
        date: d.date_revenu || d.date,
      })));
      const prevList = Array.isArray(revsPrev) ? revsPrev : [];
      setPrevMonthTotal(prevList.reduce((a:number,r:any)=>a+Number(r.montant||r.mt||0),0));
      const clist = Array.isArray(comp) ? comp : [];
      setComptes(clist);
      if (clist.length > 0 && !compteId) setCompteId(clist[0].id);
      const existingNames = new Set(list.map((c:any)=>(c.libelle||c.nom)));
      let changed = false;
      for (const cat of DEFAULT_CATEGORIES) {
        if (!existingNames.has(cat.nom)) {
          try { await api.categories.create({ ...cat, libelle: cat.nom }); changed = true; } catch {}
        }
      }
      if (changed) {
        const res2 = await api.categories.list();
        list = Array.isArray(res2) ? res2 : ((res2 as any)?.data || (res2 as any)?.categories || []);
      }
      setCategories(list);
      const map: Record<number,any> = {};
      list.forEach((c:any)=>{map[c.id]=c;});
      setCatsMap(map);
    } catch {}
    setLoading(false);
  };

  useEffect(()=>{load(); period.loadAvailablePeriods();},[period.month, period.year]);

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
    setCategorieId(categories.length>0?categories[0].id:null);
    setCompteId(comptes.length > 0 ? comptes[0].id : null);
    setDate(new Date());
    setShowModal(true);
  };

  const openEdit = (r:any) => {
    setShowActions(false);
    setTimeout(() => {
      setEditing(r);
      setLabel(r.libelle||r.label||'');
      setMontant(String(r.montant||r.mt||''));
      setCategorieId(r.categorie_id||null);
      setCompteId(r.compte_id||(comptes.length>0?comptes[0].id:null));
      setDate(r.date_revenu ? new Date(r.date_revenu) : new Date());
      setShowModal(true);
    }, 200);
  };

  const handleSave = async () => {
    console.log("🟢 handleSave déclenché");
    if (!label.trim()) { console.log("🔴 libellé vide"); Alert.alert('Erreur','Le libellé est requis'); return; }
    console.log("🔵 libellé OK");
    const mt = parseInt(montant);
    if (!mt||mt<=0) { console.log("🔴 montant invalide"); Alert.alert('Erreur','Montant invalide'); return; }
    console.log("🔵 montant OK");
    if (!categorieId) { console.log("🔴 catégorie manquante"); Alert.alert('Erreur','Sélectionnez une catégorie'); return; }
    console.log("🔵 catégorie OK");
    if (!compteId) { console.log("🔴 compte manquant"); Alert.alert('Erreur','Sélectionnez un compte'); return; }
    console.log("🔵 compte OK");
    setSaving(true);
    try {
      const data = { libelle: label.trim(), montant: mt, categorie_id: categorieId, date_revenu: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, compte_id: compteId };
      console.log("🟡 Données envoyées :", JSON.stringify(data));
      console.log("🟣 Appel API...");
      if (editing) await api.revenus.update(editing.id, data);
      else await api.revenus.create(data);
      console.log("🟢 Appel API réussi");
      setSaving(false);
      await new Promise(r => setTimeout(r, 400));
      const sourceMsg = `Montant crédité sur ${comptes.find((c:any) => c.id === compteId)?.nom_compte || 'le compte'}`;
      setSuccessSub(sourceMsg);
      setSuccess(true);
      checkScale.value = withSpring(1,{damping:8,stiffness:150});
    } catch (e:any) {
      console.log("🔴 ERREUR catch :", e.message);
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
    setShowActions(false);
    Alert.alert('Supprimer',`Supprimer « ${r.label} » ?`,[
      { text:'Annuler', style:'cancel' },
      { text:'Confirmer', style:'destructive', onPress:async()=>{
        try { await api.revenus.remove(r.id); load(); }
        catch(e:any){ Alert.alert('Erreur',e.message||'Impossible de supprimer'); }
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
        title="Revenus"
        icon="💰"
        backRoute="/transactions"
        color={C.dark}
      />

      <ScrollView
        style={{ flex:1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Carte résumé ──────────────── */}
        <View style={s.summaryCard}>
          <View style={s.summaryContent}>
            <View style={s.summaryTop}>
              <View style={s.summaryIconWrap}>
                <Text style={s.summaryIcon}>📈</Text>
              </View>
              <Text style={s.summaryLbl}>Total des revenus</Text>
            </View>
            <View style={s.summaryAmountRow}>
              <Text style={s.summaryAmount}>{dotSep(Math.round(monthTotal || 0))}</Text>
              <Text style={s.summaryCurrency}>FCFA</Text>
            </View>
            <View style={s.summaryMeta}>
              <Text style={s.summaryMonth}>
                {formatMonthYear(period.month, period.year)}
              </Text>
              {revenus.length === 0 ? (
                <Text style={s.summaryEmptyCount}>Aucun revenu enregistré</Text>
              ) : (
                <Text style={s.summaryCount}>{filtered.length} revenu{filtered.length > 1 ? 's' : ''}</Text>
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
            ) : revenus.length === 0 ? (
              <Text style={s.summaryEvoPlaceholder}>Ajoutez votre premier revenu</Text>
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
              placeholder="Rechercher un revenu..."
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

        {/* ── Loading ───────────────────── */}
        {loading ? (
          <ActivityIndicator color={C.cardGreen} size="large" style={{marginVertical:48}} />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcoWrap}>
              <Text style={s.emptyIco}>💰</Text>
            </View>
            <Text style={s.emptyTxt}>
              {searchQuery ? 'Aucun résultat trouvé' : 'Aucun revenu enregistré'}
            </Text>
            <Text style={s.emptySub}>
              {searchQuery
                ? 'Essayez de modifier vos critères de recherche'
                : 'Commencez par ajouter votre premier revenu'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={s.emptyBtn} onPress={openAdd} activeOpacity={0.8}>
                <Text style={s.emptyBtnTxt}>+ Ajouter un revenu</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* ── Liste des revenus ──────────── */
          <>
            <Text style={s.listHeader}>
              {filtered.length} revenu{filtered.length > 1 ? 's' : ''}
            </Text>
            {filtered.map((r,i) => {
              const c = catsMap[r.categorie_id];
              return (
                <TouchableOpacity
                  key={r.id||i}
                  style={s.item}
                  onPress={()=>openActions(r)}
                  activeOpacity={0.85}
                >
                  <View style={[s.itemBadge, { backgroundColor: c?.couleur || 'rgba(34,197,94,0.15)' }]}>
                    <Text style={s.itemEmoji}>{c?.icone || c?.emoji || '💰'}</Text>
                  </View>
                  <View style={s.itemInfo}>
                    <Text style={s.itemLabel}>{r.label}</Text>
                    <Text style={s.itemCat}>{c?.libelle || c?.nom || 'Catégorie'}</Text>
                    <View style={{flexDirection:'row', alignItems:'center'}}><Ionicons name="chevron-forward" size={11} color={C.hint} style={{marginRight:4}} /><Text style={s.itemAccount}>{r.nom_compte || 'Compte'}</Text></View>
                  </View>
                  <View style={s.itemRight}>
                    <Text style={s.itemDate}>{formatDate(r.date)}</Text>
                    <Text style={s.itemMt}>{fmt(r.montant||r.mt)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* ── FAB ──────────────────────────── */}
      {revenus.length > 0 && (
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
                    <View style={[s.actionBadge, { backgroundColor: catsMap[selected.categorie_id]?.couleur || 'rgba(34,197,94,0.15)' }]}>
                      <Text style={s.actionEmoji}>{catsMap[selected.categorie_id]?.icone || catsMap[selected.categorie_id]?.emoji || '💰'}</Text>
                    </View>
                    <View style={s.actionPreviewInfo}>
                      <Text style={s.actionPreviewLabel}>{selected.label}</Text>
                      <Text style={s.actionPreviewCat}>{catsMap[selected.categorie_id]?.libelle || catsMap[selected.categorie_id]?.nom || 'Catégorie'}</Text>
                      <View style={{flexDirection:'row', alignItems:'center'}}><Ionicons name="chevron-forward" size={11} color={C.hint} style={{marginRight:4}} /><Text style={s.actionPreviewAccount}>{selected.nom_compte || 'Compte'}</Text></View>
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
        <View style={{flex:1, position:'relative'}}>
<View style={s.blur}>
            <ScrollView contentContainerStyle={s.overlay} keyboardShouldPersistTaps="handled">
              <Pressable onPress={() => Keyboard.dismiss()} style={{ width: '100%' }}>
              <Animated.View style={[s.modalCard, cardStyle]}>
                {success ? (
                  <View style={s.successWrap}>
                    <Animated.View style={[s.successCircle, checkStyle]}>
                      <Text style={s.successIcon}>✓</Text>
                    </Animated.View>
                    <Text style={s.successTitle}>Revenu {editing?'modifié':'ajouté'} !</Text>
                    {successSub ? <Text style={s.successSubTxt}>{successSub}</Text> : null}
                    <TouchableOpacity style={s.successOkBtn} onPress={handleSuccessClose} activeOpacity={0.85}>
                      <Text style={s.successOkBtnTxt}>OK</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={s.modalHeader}>
                      <View style={s.modalHeaderText}>
                        <Text style={s.modalTitle}>{editing?'Modifier':'Nouveau'} revenu</Text>
                      </View>
                      <Pressable onPress={()=>setTimeout(()=>setShowModal(false),600)} style={s.closeBtn} hitSlop={8}>
                        <Text style={s.closeBtnTxt}>✕</Text>
                      </Pressable>
                    </View>

                    <Text style={s.modalSub}>Libellé</Text>
                    <TextInput
                      style={[s.input,focusedField==='label'&&s.inputFocused]}
                      value={label} onChangeText={setLabel}
                      placeholder="Ex: Salaire" placeholderTextColor={C.hint}
                      onFocus={()=>setFocusedField('label')} onBlur={()=>setFocusedField(null)}
                    />

                    <Text style={s.modalSub}>Montant (FCFA)</Text>
                    <TextInput
                      style={[s.input,focusedField==='mt'&&s.inputFocused]}
                      value={montant} onChangeText={setMontant}
                      placeholder="Ex: 500000" placeholderTextColor={C.hint}
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

                    <Text style={s.modalSub}>Compte</Text>
                    <TouchableOpacity style={s.selectBtn} onPress={()=>setShowCompteDropdown(true)} activeOpacity={0.7}>
                      <Text style={s.selectBtnTxt}>
                        {comptes.find((c:any)=>c.id===compteId)?.nom_compte || 'Sélectionner un compte'}
                      </Text>
                      <Ionicons name="chevron-down" size={11} color={C.hint} />
                    </TouchableOpacity>

                    <Text style={s.modalSub}>Date *</Text>
                    <TouchableOpacity style={s.selectBtn} onPress={()=>setShowDatePicker(true)} activeOpacity={0.7}>
                      <Text style={s.selectBtnTxt}>{date.toLocaleDateString('fr-FR')}</Text>
                      <Ionicons name="chevron-down" size={11} color={C.hint} />
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={(evt, selected) => {
                          setShowDatePicker(Platform.OS === 'ios');
                          if (selected) setDate(selected);
                        }}
                      />
                    )}

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
          </View>
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
                      <Text style={[s.dropdownItemTxt, categorieId===c.id&&{fontWeight:'700',color:C.cardGreen}]}>{c.libelle||c.nom}</Text>
                      {categorieId===c.id && <Text style={{marginLeft:'auto',color:C.cardGreen,fontWeight:'700'}}>✓</Text>}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <Pressable style={{flex:1}} onPress={()=>setShowCatDropdown(false)} />
            </View>
          )}
          {showCompteDropdown && (
            <View style={s.dropdownOverlay}>
              <Pressable style={{flex:1}} onPress={()=>setShowCompteDropdown(false)} />
              <View style={s.dropdownCard}>
                <ScrollView style={{maxHeight:200}}>
                  {comptes.map((c:any)=>(
                    <Pressable
                      key={c.id}
                      style={[s.dropdownItem, compteId===c.id&&{backgroundColor:'#D1FAE5'}]}
                      onPress={()=>{setCompteId(c.id);setShowCompteDropdown(false);}}
                    >
                      <Text style={[s.dropdownItemTxt, compteId===c.id&&{fontWeight:'700',color:C.cardGreen}]}>{c.nom_compte}</Text>
                      {compteId===c.id && <Text style={{marginLeft:'auto',color:C.cardGreen,fontWeight:'700'}}>✓</Text>}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <Pressable style={{flex:1}} onPress={()=>setShowCompteDropdown(false)} />
            </View>
          )}
        </View>
      </Modal>
    </ScreenWrapper>
  );
}





