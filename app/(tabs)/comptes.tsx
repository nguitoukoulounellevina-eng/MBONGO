import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTheme } from '@/app/contexts/ThemeContext';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { PageHeader } from '@/app/components/PageHeader';
import api, { notify } from '@/app/services/api';
import { comptesCache } from '@/app/services/cache';
import { Spacing, Radius } from '@/constants/spacing';
import { Ionicons } from '@expo/vector-icons';
import { fmtCurrency } from '@/app/utils/format';
import { useToast } from '@/app/services/ToastContext';



const TYPE_ICONS: Record<string,string> = { banque:'🏦', momo:'📱', especes:'💵', autre:'🏛️' };
const TYPE_LABELS: Record<string,string> = { banque:'Banque', momo:'Mobile Money', especes:'Espèces', autre:'Autre' };
const TYPE_LIST = ['banque','momo','especes','autre'];

const DEVISE_LIST = [
  { code:'XAF', label:'FCFA (XAF)' },
  { code:'EUR', label:'Euro (EUR)' },
  { code:'USD', label:'Dollar US (USD)' },
  { code:'XOF', label:'Franc CFA BCEAO (XOF)' },
  { code:'CDF', label:'Franc Congolais (CDF)' },
];

const MOBILE_MONEY_NAMES = ['airtel','mtn','orange','moov','wave','free money','mobile money'];
const typeIcon = (t: string, tp?: string) => {
  if (t === 'autre' && tp) {
    if (MOBILE_MONEY_NAMES.some(k => tp.toLowerCase().includes(k))) return '📱';
    return '🏛️';
  }
  return TYPE_ICONS[t] || '🏛️';
};
const typeLabel = (t: string, tp?: string) => {
  if (t === 'autre' && tp) {
    if (MOBILE_MONEY_NAMES.some(k => tp.toLowerCase().includes(k))) return 'Mobile Money';
    return tp;
  }
  return TYPE_LABELS[t] || t;
};

export default function Comptes() {
  const { colors: C, isDark } = useTheme();
  const showToast = useToast();
  const styles = useMemo(() => StyleSheet.create({
  content:{ padding:Spacing.lg, flexGrow:1 },
  emptyWrap:{ alignItems:'center', paddingVertical:60 },
  emptyIco:{ fontSize:49, marginBottom:Spacing.lg },
  emptyTxt:{ fontSize:16, fontWeight:'700', color:C.dark, marginBottom:6 },
  emptySub:{ fontSize:12, color:C.muted, textAlign:'center', lineHeight:Spacing.lg },
  addBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:Spacing.sm, backgroundColor:C.cardGreen, borderRadius:Radius.xl, padding:Spacing.lg, marginTop:Spacing.sm },
  addBtnIco:{ fontSize:19, fontWeight:'700', color:C.white },
  addBtnTxt:{ fontSize:14, fontWeight:'700', color:C.white },

  summaryCard:{ backgroundColor: isDark ? C.white : C.dark, borderRadius:Radius.xl, padding:Spacing.xl, marginBottom:Spacing.xl },
  summaryRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:Spacing.xs },
  summaryDivider:{ height:1, backgroundColor:'rgba(255,255,255,0.1)', marginVertical:Spacing.xs },
  summaryLbl:{ fontSize:12, fontWeight:'600', color:'rgba(255,255,255,0.5)' },
  summaryVal:{ fontSize:16, fontWeight:'800', color:C.white },
  summaryValSm:{ fontSize:14, fontWeight:'700', color:'rgba(255,255,255,0.8)' },
  summaryCurrency:{ fontSize:14, fontWeight:'600', color:'rgba(255,255,255,0.5)', marginTop:Spacing.xs },

  card:{ backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.lg, marginBottom:Spacing.md, borderWidth:1, borderColor:C.border, shadowColor:C.dark, shadowOffset:{width:0,height:2}, shadowOpacity:0.03, shadowRadius:6, elevation:2 },
  cardTop:{ flexDirection:'row', alignItems:'center' },
  cardIco:{ fontSize:23, marginRight:Spacing.md },
  cardInfo:{ flex:1 },
  cardNom:{ fontSize:15, fontWeight:'700', color:C.dark, marginBottom:1 },
  cardType:{ fontSize:11, color:C.muted },
  cardReserve:{ fontSize:10, color:C.warning, fontWeight:'600', marginTop:1 },
  cardSolde:{ fontSize:15, fontWeight:'800', color:C.dark, marginRight:Spacing.xs },
  overdraftBadge:{ backgroundColor:C.danger, borderRadius:6, paddingHorizontal:5, paddingVertical:2, marginLeft:2 },
  overdraftTxt:{ fontSize:10, fontWeight:'700', color:C.white },
  menuBtn:{ width:28, height:28, borderRadius:Radius.xl, alignItems:'center', justifyContent:'center' },
  menuDots:{ fontSize:17, color:C.muted, fontWeight:'700' },
  menuActions:{ flexDirection:'row', justifyContent:'flex-end', gap:Spacing.md, paddingTop:Spacing.md, marginTop:Spacing.md, borderTopWidth:1, borderTopColor:C.border },
  menuAction:{ flexDirection:'row', alignItems:'center', gap:Spacing.xs },
  menuActionIco:{ fontSize:13 },
  menuActionTxt:{ fontSize:13, fontWeight:'600', color:C.text },

  blur:{ flex:1 },
  overlay:{ flex:1, justifyContent:'center', alignItems:'center', padding:Spacing.lg },
  modalCard:{ backgroundColor:C.white, borderRadius:Radius.xl, padding:Spacing.lg, width:'100%', maxWidth:420, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.15, shadowRadius:24, elevation:16 },
  modalHeader:{ flexDirection:'row', alignItems:'flex-start', marginBottom:Spacing.md },
  modalHeaderText:{ flex:1 },
  closeBtn:{ width:32, height:32, borderRadius:Radius.full, backgroundColor:C.surface, alignItems:'center', justifyContent:'center', marginLeft:'auto' },
  closeBtnTxt:{ fontSize:15, fontWeight:'600', color:C.muted },
  modalTitle:{ fontSize:21, fontWeight:'800', color:C.dark },
  modalSub:{ fontSize:12, fontWeight:'700', color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:Spacing.xs, marginTop:Spacing.sm },
  input:{ backgroundColor:C.white, borderRadius:Radius.md, padding:Spacing.md, fontSize:16, fontWeight:'600', color:C.dark, borderWidth:1.5, borderColor:C.border },
  inputFocused:{ borderColor:C.purple, backgroundColor:'#F8F6FF' },
  modalScrollContent:{ flex:1 },

  selectBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:C.white, borderRadius:Radius.md, padding:Spacing.md, borderWidth:1.5, borderColor:C.border, gap:Spacing.sm },
  selectBtnTxt:{ flex:1, fontSize:16, fontWeight:'600', color:C.text },
  selectArrow:{ fontSize:11, color:C.muted },
  soldeRow:{ flexDirection:'row', gap:Spacing.sm, alignItems:'center' },
  soldeInput:{ flex:1 },
  deviseSelect:{ width:150 },
  dropdownOverlay:{ position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:100, backgroundColor:'rgba(0,0,0,0.15)' },
  dropdownCard:{ alignSelf:'center', width:'85%', maxWidth:360, backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.sm, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.15, shadowRadius:24, elevation:16, borderWidth:1, borderColor:C.border },
  dropdownItem:{ flexDirection:'row', alignItems:'center', gap:Spacing.md, paddingVertical:Spacing.md, paddingHorizontal:Spacing.md, borderRadius:Radius.md },
  dropdownItemTxt:{ fontSize:16, fontWeight:'500', color:C.text },
  modalActions:{ flexDirection:'row', gap:Spacing.sm, marginTop:Spacing.xs },
  cancelBtn:{ flex:1, borderRadius:Radius.md, height:38, flexDirection:'row', gap:5, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:C.border, backgroundColor:C.white },
  cancelBtnPressed:{ borderColor:C.cardGreen, backgroundColor:'#ECFDF5' },
  cancelBtnTxt:{ fontSize:12, fontWeight:'700', color:C.muted },
  saveBtn:{ flex:1, borderRadius:Radius.md, height:38, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:5, backgroundColor:C.cardGreen, shadowColor:C.cardGreen, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
  saveBtnTxt:{ fontSize:12, fontWeight:'700', color:C.white },
  saveBtnDisabled:{ opacity:0.6 },
  saveBtnPressed:{ backgroundColor: C.cardGreen, opacity:0.85 },
  inputError:{ borderColor:C.danger, borderWidth:1.5 },
  errorText:{ fontSize:12, fontWeight:'600', color:C.danger, marginTop:Spacing.xs, marginLeft:2 },
  btnHalf:{ flex:1, borderRadius:Radius.md },
  btnShadow:{ shadowColor:C.cardGreen, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
  sqRow:{ flexDirection:'row', gap:Spacing.xs, alignItems:'center' },
  sq:{ width:6, height:6, borderRadius:1.5, backgroundColor:C.cardGreen },
  sqLight:{ backgroundColor:'rgba(255,255,255,0.7)' },
  successWrap:{ alignItems:'center', paddingVertical:Spacing.xl },
  successCircle:{ width:64, height:64, borderRadius:32, backgroundColor:C.green, alignItems:'center', justifyContent:'center', marginBottom:Spacing.lg },
  successIcon:{ fontSize:29, color:C.white, fontWeight:'800' },
  successTitle:{ fontSize:21, fontWeight:'800', color:C.dark, marginBottom:Spacing.xs },

  sectionCard:{ backgroundColor:C.surface, borderRadius:Radius.lg, padding:Spacing.lg, marginBottom:Spacing.md, borderWidth:1, borderColor:C.border },
  sectionHeader:{ flexDirection:'row', alignItems:'center', gap:Spacing.sm, marginBottom:Spacing.md },
  sectionIco:{ fontSize:16 },
  sectionTitle:{ fontSize:14, fontWeight:'700', color:C.dark },
  fieldLabel:{ fontSize:13, fontWeight:'600', color:C.muted, marginBottom:6 },

  deleteIconWrap:{ width:64, height:64, borderRadius:32, backgroundColor:'#FEF2F2', alignItems:'center', justifyContent:'center', marginBottom:Spacing.md },
  deleteIcon:{ fontSize:29 },
  deleteTargetName:{ fontSize:19, fontWeight:'800', color:C.dark, marginBottom:2 },
  deleteTargetSolde:{ fontSize:16, fontWeight:'700', color:C.muted, marginBottom:Spacing.xl },
  deleteWarning:{ fontSize:14, fontWeight:'500', color:C.muted, textAlign:'center', lineHeight:18, paddingHorizontal:Spacing.sm },
  deleteConfirmBtn:{ flex:1, borderRadius:Radius.md, height:38, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:5, backgroundColor:C.danger, shadowColor:C.danger, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
  deleteConfirmBtnPressed:{ backgroundColor:'#E0114A' },
  deleteConfirmTxt:{ fontSize:12, fontWeight:'700', color:C.white },
}), [C]);
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const [comptes, setComptes] = useState<any[]>(comptesCache.data ?? []);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [nomCompte, setNomCompte] = useState('');
  const [typeCompte, setTypeCompte] = useState('banque');
  const [soldeInitial, setSoldeInitial] = useState('');
  const [typePersonnalise, setTypePersonnalise] = useState('');
  const [devise, setDevise] = useState('XAF');
  const [showDeviseDropdown, setShowDeviseDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuId, setMenuId] = useState<number|null>(null);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [dotButton, setDotButton] = useState<'cancel'|'save'|null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string|null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any|null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const cardEntry = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const deleteCardEntry = useSharedValue(0);
  const deleteCheckScale = useSharedValue(0);
  const cancelDotSlide = useSharedValue(0);
  const saveDotSlide = useSharedValue(0);

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
  const cancelDot1 = useAnimatedStyle(() => ({ transform: [{ translateX: cancelDotSlide.value }] }));
  const cancelDot2 = useAnimatedStyle(() => ({ transform: [{ translateX: -cancelDotSlide.value }] }));
  const saveDot1 = useAnimatedStyle(() => ({ transform: [{ translateX: saveDotSlide.value }] }));
  const saveDot2 = useAnimatedStyle(() => ({ transform: [{ translateX: -saveDotSlide.value }] }));

  const deleteCardStyle = useAnimatedStyle(() => ({
    opacity: deleteCardEntry.value,
    transform: [
      { scale: 0.85 + deleteCardEntry.value * 0.15 },
      { translateY: (1 - deleteCardEntry.value) * 40 },
    ],
  }));
  const deleteCheckAnimated = useAnimatedStyle(() => ({
    transform: [{ scale: deleteCheckScale.value }],
    opacity: deleteCheckScale.value,
  }));

  useEffect(() => {
    if (showModal) {
      cardEntry.value = withSpring(1, { damping: 14, stiffness: 100 });
      checkScale.value = 0;
      setSuccess(false);
    } else {
      cardEntry.value = 0;
      cancelDotSlide.value = 0;
      saveDotSlide.value = 0;
      setDotButton(null);
    }
  }, [showModal]);

  useEffect(() => {
    if (showDeleteModal) {
      deleteCardEntry.value = withSpring(1, { damping: 14, stiffness: 100 });
      deleteCheckScale.value = 0;
      setDeleteSuccess(false);
    } else {
      deleteCardEntry.value = 0;
    }
  }, [showDeleteModal]);

  const load = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const res = await api.comptes.list(now.getMonth() + 1, now.getFullYear());
      const list = Array.isArray(res) ? res : [];
      comptesCache.data = list;
      comptesCache.loaded = true;
      setComptes(list);
    } catch (err) {
      console.warn('load comptes', err);
      if (comptesCache.data) setComptes(comptesCache.data);
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const totalSolde = comptes.reduce((acc: number, c: any) => acc + (parseFloat(c.solde_actuel || 0) || 0), 0);
  const totalReserve = comptes.reduce((acc: number, c: any) => acc + (parseFloat(c.reserve || 0) || 0), 0);
  const totalOriginal = totalSolde + totalReserve;

  const openAdd = () => {
    setEditing(null);
    setNomCompte('');
    setTypeCompte('banque');
    setSoldeInitial('');
    setTypePersonnalise('');
    setDevise('XAF');
    setErrors({});
    setFocusedField(null);
    setShowTypeDropdown(false);
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setMenuId(null);
    setEditing(c);
    setNomCompte(c.nom_compte || '');
    setTypeCompte(c.type_compte || 'banque');
    setSoldeInitial(String(c.solde_initial || 0));
    setTypePersonnalise(c.type_personnalise || '');
    setDevise(c.devise || 'XAF');
    setErrors({});
    setFocusedField(null);
    setShowTypeDropdown(false);
    setShowModal(true);
  };

  const validate = (): boolean => {
    const errs: Record<string,string> = {};
    if (!nomCompte.trim()) errs.nomCompte = 'Le nom du compte est requis';
    if (typeCompte === 'autre' && !typePersonnalise.trim()) errs.typePersonnalise = 'Précisez le type de compte';
    if (!devise) errs.devise = 'Sélectionnez une devise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const data: any = { nom_compte: nomCompte.trim(), type_compte: typeCompte, type_personnalise: typeCompte === 'autre' ? typePersonnalise.trim() || null : null, devise, solde_initial: 0 };
      if (editing) {
        const updated = await api.comptes.update(editing.id, data);
        setComptes(prev => {
          const next = prev.map(c => c.id === editing.id ? updated : c);
          comptesCache.data = next;
          return next;
        });
      } else {
        const created = await api.comptes.create(data);
        setComptes(prev => {
          const next = [...prev, created];
          comptesCache.data = next;
          return next;
        });
      }
      setSaving(false);
      await new Promise(r => setTimeout(r, 400));
      setSuccess(true);
      checkScale.value = withSpring(1, { damping: 8, stiffness: 150 });
      showToast({ type: 'success', titre: editing ? 'Compte modifié' : 'Compte créé', message: `${nomCompte.trim()}`, icone: '🏦' });
      notify('success', editing ? 'Compte modifié' : 'Compte créé', `${nomCompte.trim()}`);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setErrors({});
        load();
      }, 600);
    } catch (e: any) {
      setSaving(false);
      cancelDotSlide.value = withTiming(0);
      saveDotSlide.value = withTiming(0);
      setDotButton(null);
      Alert.alert('Erreur', e.message || 'Impossible d\'enregistrer');
    }
  };

  const clearError = (field: string) => setErrors(prev => { const n = {...prev}; delete n[field]; return n; });

  const handleDelete = (id: number) => {
    setMenuId(null);
    const target = comptes.find(c => c.id === id);
    setDeleteTarget(target || null);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.comptes.remove(deleteTarget.id);
      setComptes(prev => {
        const next = prev.filter(c => c.id !== deleteTarget.id);
        comptesCache.data = next;
        return next;
      });
      setDeleting(false);
      await new Promise(r => setTimeout(r, 400));
      setDeleteSuccess(true);
      deleteCheckScale.value = withSpring(1, { damping: 8, stiffness: 150 });
      showToast({ type: 'info', titre: 'Compte supprimé', message: `${deleteTarget.nom_compte}`, icone: '🗑️' });
      notify('info', 'Compte supprimé', `${deleteTarget.nom_compte}`);
      setTimeout(() => {
        setShowDeleteModal(false);
        setDeleteSuccess(false);
        setDeleteTarget(null);
        load();
      }, 800);
    } catch (e: any) {
      setDeleting(false);
      Alert.alert('Erreur', e.message || 'Impossible de supprimer');
    }
  };

  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <StatusBar style="light" />
      <PageHeader title="Comptes" icon="💰" color={C.dark} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={C.purple} />
          </View>
        ) : (
          <>
            {/* Carte résumé */}
            {comptes.length > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLbl}>Solde total</Text>
                  <Text style={styles.summaryValSm}>{fmtCurrency(totalOriginal)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLbl}>Réservé dans les budgets</Text>
                  <Text style={[styles.summaryValSm, {color:C.warning}]}>{fmtCurrency(totalReserve)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLbl}>Disponible</Text>
                  <Text style={[styles.summaryVal, totalSolde < 0 && { color: C.danger }]}>{fmtCurrency(totalSolde)}</Text>
                </View>
              </View>
            )}

            {/* Liste des comptes */}
            {comptes.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyIco}>🏦</Text>
                <Text style={styles.emptyTxt}>Aucun compte</Text>
                <Text style={styles.emptySub}>Créez votre premier compte bancaire, Mobile Money ou caisse espèces</Text>
              </View>
            ) : (
              comptes.map((c, i) => (
                <View key={c.id||i} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardIco}>{typeIcon(c.type_compte, c.type_personnalise)}</Text>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardNom}>{c.nom_compte}</Text>
                      <Text style={styles.cardType}>{typeLabel(c.type_compte, c.type_personnalise)}</Text>
                      {parseFloat(c.reserve||0) > 0 && (
                        <Text style={styles.cardReserve}>Réservé: {fmtCurrency(c.reserve)}</Text>
                      )}
                    </View>
                    <Text style={[styles.cardSolde, c.solde_actuel < 0 && { color: C.danger }]}>{fmtCurrency(c.solde_actuel, c.devise)}</Text>
                    {c.solde_actuel < 0 && c.type_compte === 'banque' && (
                      <View style={styles.overdraftBadge}>
                        <Text style={styles.overdraftTxt}>Découvert</Text>
                      </View>
                    )}
                    <TouchableOpacity onPress={() => setMenuId(menuId === c.id ? null : c.id)} style={styles.menuBtn}>
                      <Text style={styles.menuDots}>⋯</Text>
                    </TouchableOpacity>
                  </View>
                  {menuId === c.id && (
                    <View style={styles.menuActions}>
                      <TouchableOpacity style={styles.menuAction} onPress={() => openEdit(c)}>
                        <Text style={styles.menuActionIco}>✏️</Text>
                        <Text style={styles.menuActionTxt}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.menuAction} onPress={() => handleDelete(c.id)}>
                        <Text style={styles.menuActionIco}>🗑️</Text>
                        <Text style={[styles.menuActionTxt, {color:C.danger}]}>Supprimer</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Text style={styles.addBtnIco}>+</Text>
          <Text style={styles.addBtnTxt}>Ajouter un compte</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Modal ─────────────────────── */}
      <Modal visible={showModal} transparent animationType="none" onRequestClose={()=>setShowModal(false)}>
        <View style={{flex:1, position:'relative'}}>
          <BlurView intensity={15} tint="dark" style={styles.blur}>
            <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1}}>
            <View style={styles.overlay}>
              <Animated.View style={[styles.modalCard, {minHeight:310, maxHeight: screenH * 0.82}, cardStyle]}>
                {success ? (
                  <View style={styles.successWrap}>
                    <Animated.View style={[styles.successCircle, checkStyle]}>
                      <Text style={styles.successIcon}>✓</Text>
                    </Animated.View>
                    <Text style={styles.successTitle}>Compte {editing ? 'modifié' : 'ajouté'} !</Text>
                  </View>
                ) : (
                  <View style={{flex:1}}>
                    <View style={styles.modalHeader}>
                      <View style={styles.modalHeaderText}>
                        <Text style={styles.modalTitle}>{editing ? 'Modifier le compte' : 'Nouveau compte'}</Text>
                      </View>
                      <Pressable onPress={()=>setShowModal(false)} style={styles.closeBtn} hitSlop={8}>
                        <Text style={styles.closeBtnTxt}>✕</Text>
                      </Pressable>
                    </View>

                    <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:8}}>

                      {/* Section Informations */}
                      <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionIco}>📝</Text>
                          <Text style={styles.sectionTitle}>Informations</Text>
                        </View>
                        <Text style={styles.fieldLabel}>Nom du compte</Text>
                        <TextInput
                          style={[styles.input, focusedField==='nom'&&styles.inputFocused, errors.nomCompte&&styles.inputError]}
                          value={nomCompte} onChangeText={v=>{setNomCompte(v);clearError('nomCompte');}}
                          placeholder="Ex: Compte Courant"
                          placeholderTextColor={C.hint}
                          onFocus={()=>setFocusedField('nom')}
                          onBlur={()=>setFocusedField(null)}
                        />
                        {errors.nomCompte && <Text style={styles.errorText}>{errors.nomCompte}</Text>}
                      </View>

                      {/* Section Type */}
                      <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionIco}>🏷️</Text>
                          <Text style={styles.sectionTitle}>Type de compte</Text>
                        </View>
                        <Pressable
                          style={[styles.selectBtn, focusedField==='type'&&styles.inputFocused]}
                          onPress={()=>{setShowTypeDropdown(true);setFocusedField('type');}}
                        >
                          <Text style={{fontSize:17}}>{typeIcon(typeCompte)}</Text>
                          <Text style={styles.selectBtnTxt}>{typeLabel(typeCompte)}</Text>
                          <Ionicons name="chevron-down" size={11} color={C.muted} />
                        </Pressable>

                        {typeCompte === 'autre' && (
                          <>
                            <Text style={[styles.fieldLabel, {marginTop:10}]}>Précisez le type</Text>
                            <TextInput
                              style={[styles.input, focusedField==='typePerso'&&styles.inputFocused, errors.typePersonnalise&&styles.inputError]}
                              value={typePersonnalise} onChangeText={v=>{setTypePersonnalise(v);clearError('typePersonnalise');}}
                              placeholder="Ex: Crypto, Assurance..."
                              placeholderTextColor={C.hint}
                              onFocus={()=>setFocusedField('typePerso')}
                              onBlur={()=>setFocusedField(null)}
                            />
                            {errors.typePersonnalise && <Text style={styles.errorText}>{errors.typePersonnalise}</Text>}
                          </>
                        )}
                      </View>

                      {/* Section Devise */}
                      <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionIco}>💰</Text>
                          <Text style={styles.sectionTitle}>Solde initial</Text>
                        </View>
                        <Text style={styles.fieldLabel}>Le solde du compte sera de 0 XAF. Ajoutez de l'argent dans la partie Revenus.</Text>
                      </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                      <Animated.View style={[styles.btnHalf]}>
                        <Pressable
                          style={({pressed})=>[styles.cancelBtn, pressed&&styles.cancelBtnPressed]}
                          onPress={()=>setShowModal(false)}
                          onPressIn={()=>{
                            setDotButton('cancel');
                            cancelDotSlide.value = withRepeat(
                              withTiming(8,{duration:500,easing:Easing.inOut(Easing.sin)}),
                              -1,true
                            );
                          }}
                        >
                          {dotButton==='cancel' && (
                            <View style={styles.sqRow}>
                              <Animated.View style={[styles.sq, cancelDot1]} />
                              <Animated.View style={[styles.sq, cancelDot2]} />
                            </View>
                          )}
                          <Text style={styles.cancelBtnTxt}>Annuler</Text>
                        </Pressable>
                      </Animated.View>
                      <Pressable
                        style={({pressed})=>[styles.saveBtn, pressed&&styles.saveBtnPressed, saving&&styles.saveBtnDisabled]}
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
                              <View style={styles.sqRow}>
                                <Animated.View style={[styles.sq, styles.sqLight, saveDot1]} />
                                <Animated.View style={[styles.sq, styles.sqLight, saveDot2]} />
                              </View>
                            )}
                            <Text style={styles.saveBtnTxt}>Enregistrer</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </Animated.View>
            </View>
            </KeyboardAvoidingView>
          </BlurView>
          {showDeviseDropdown && (
            <View style={styles.dropdownOverlay}>
              <Pressable style={{flex:1}} onPress={()=>setShowDeviseDropdown(false)} />
              <View style={styles.dropdownCard}>
                <ScrollView style={{maxHeight:240}}>
                  {DEVISE_LIST.map((d,i) => (
                    <Pressable
                      key={d.code}
                      style={[styles.dropdownItem, devise===d.code&&{backgroundColor:'#D1FAE5'}]}
                      onPress={()=>{setDevise(d.code);setShowDeviseDropdown(false);}}
                    >
                      <Text style={[styles.dropdownItemTxt, devise===d.code&&{fontWeight:'700',color:C.cardGreen}]}>{d.label}</Text>
                      {devise===d.code && <Text style={{marginLeft:'auto',color:C.cardGreen,fontWeight:'700'}}>✓</Text>}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <Pressable style={{flex:1}} onPress={()=>setShowDeviseDropdown(false)} />
            </View>
          )}
          {showTypeDropdown && (
            <View style={styles.dropdownOverlay}>
              <Pressable style={{flex:1}} onPress={()=>{setShowTypeDropdown(false);setFocusedField(null);}} />
              <View style={styles.dropdownCard}>
                <ScrollView style={{maxHeight:240}}>
                  {TYPE_LIST.map(t => (
                    <Pressable
                      key={t}
                      style={[styles.dropdownItem, typeCompte===t&&{backgroundColor:'#D1FAE5'}]}
                      onPress={()=>{setTypeCompte(t);setShowTypeDropdown(false);}}
                    >
                      <Text style={{fontSize:17, marginRight:8}}>{typeIcon(t)}</Text>
                      <Text style={[styles.dropdownItemTxt, typeCompte===t&&{fontWeight:'700',color:C.cardGreen}]}>{typeLabel(t)}</Text>
                      {typeCompte===t && <Text style={{marginLeft:'auto',color:C.cardGreen,fontWeight:'700'}}>✓</Text>}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <Pressable style={{flex:1}} onPress={()=>{setShowTypeDropdown(false);setFocusedField(null);}} />
            </View>
          )}
        </View>
      </Modal>

      {/* ── Modal Suppression ─────────────── */}
      <Modal visible={showDeleteModal} transparent animationType="none" onRequestClose={()=>setShowDeleteModal(false)}>
        <View style={{flex:1, position:'relative'}}>
          <BlurView intensity={15} tint="dark" style={styles.blur}>
            <View style={styles.overlay}>
              <Animated.View style={[styles.modalCard, {minHeight:260, maxHeight: screenH * 0.7}, deleteCardStyle]}>
                {deleteSuccess ? (
                  <View style={styles.successWrap}>
                    <Animated.View style={[styles.successCircle, deleteCheckAnimated]}>
                      <Text style={styles.successIcon}>✓</Text>
                    </Animated.View>
                    <Text style={styles.successTitle}>Compte supprimé !</Text>
                  </View>
                ) : (
                  <View style={{flex:1}}>
                    <View style={styles.modalHeader}>
                      <View style={styles.modalHeaderText}>
                        <Text style={styles.modalTitle}>Supprimer le compte</Text>
                      </View>
                      <Pressable onPress={()=>setShowDeleteModal(false)} style={styles.closeBtn} hitSlop={8}>
                        <Text style={styles.closeBtnTxt}>✕</Text>
                      </Pressable>
                    </View>

                    <View style={{flex:1, paddingVertical:8, alignItems:'center'}}>
                      <View style={styles.deleteIconWrap}>
                        <Text style={styles.deleteIcon}>🗑️</Text>
                      </View>
                      {deleteTarget && (
                        <>
                          <Text style={styles.deleteTargetName}>{deleteTarget.nom_compte}</Text>
                          <Text style={styles.deleteTargetSolde}>{fmtCurrency(deleteTarget.solde_actuel, deleteTarget.devise)}</Text>
                        </>
                      )}
                      <Text style={styles.deleteWarning}>
                        Ce compte et toutes ses transactions seront définitivement supprimés.
                      </Text>
                    </View>

                    <View style={styles.modalActions}>
                      <Pressable
                        style={({pressed})=>[styles.cancelBtn, pressed&&styles.cancelBtnPressed]}
                        onPress={()=>setShowDeleteModal(false)}
                      >
                        <Text style={styles.cancelBtnTxt}>Annuler</Text>
                      </Pressable>
                      <Pressable
                        style={({pressed})=>[styles.deleteConfirmBtn, pressed&&styles.deleteConfirmBtnPressed, deleting&&{opacity:0.6}]}
                        onPress={confirmDelete}
                        disabled={deleting}
                      >
                        {deleting ? (
                          <ActivityIndicator color={C.white} size="small" />
                        ) : (
                          <Text style={styles.deleteConfirmTxt}>Supprimer</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </Animated.View>
            </View>
          </BlurView>
        </View>
      </Modal>

    </View>
  );
}




