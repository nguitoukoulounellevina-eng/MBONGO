import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, Dimensions, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import api, { notify } from '@/app/services/api';
import { Spacing, Radius } from '@/constants/spacing';
import { fmt } from '@/app/utils/format';
import { useTheme } from '@/app/contexts/ThemeContext';
import { PageHeader } from '@/app/components/PageHeader';
import { ScreenWrapper, FAB_BOTTOM } from '@/app/components/ScreenWrapper';
import { useToast } from '@/app/services/ToastContext';

const iconMap: Record<string, string> = {
  '🎯':'bullseye-outline','🏖️':'umbrella-outline','🏠':'home-outline','🚗':'car-outline',
  '💻':'laptop-outline','📚':'book-outline','✈️':'airplane-outline','🏥':'medkit-outline',
  '🎓':'school-outline','👶':'happy-outline','💰':'wallet-outline','🎁':'gift-outline',
  '💼':'briefcase-outline','💍':'diamond-outline','💵':'cash-outline',
  'bullseye-outline':'bullseye-outline','umbrella-outline':'umbrella-outline','home-outline':'home-outline','car-outline':'car-outline',
  'laptop-outline':'laptop-outline','book-outline':'book-outline','airplane-outline':'airplane-outline','medkit-outline':'medkit-outline',
  'school-outline':'school-outline','happy-outline':'happy-outline','wallet-outline':'wallet-outline','gift-outline':'gift-outline',
  'briefcase-outline':'briefcase-outline','diamond-outline':'diamond-outline','cash-outline':'cash-outline',
};
const toIcon = (emoji?: string) => iconMap[emoji||''] || 'flag-outline';
const WIN_H = Dimensions.get('window').height;

const ACCENT = '#F59E0B';

const ICONES = ['bullseye-outline','car-outline','home-outline','airplane-outline','laptop-outline','school-outline','briefcase-outline','diamond-outline','wallet-outline','cash-outline','umbrella-outline','book-outline','medkit-outline','happy-outline','gift-outline'];

export default function ObjectifsFinanciers() {
  const { colors: C } = useTheme();
  const showToast = useToast();
  const s = useMemo(() => StyleSheet.create({
  menuBtn:{ width:32, height:32, borderRadius:Radius.full, backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center', marginLeft:'auto' },

  // ── Scroll / Loading / Empty ──
  scroll:{ padding:Spacing.md, paddingBottom:100, flexGrow:1 },
  loadingWrap:{ alignItems:'center', paddingVertical:80 },
  emptyWrap:{ alignItems:'center', paddingVertical:60 },
  emptyDecor:{ position:'absolute', top:20 },
  emptyCircle:{ position:'absolute', borderRadius:999, opacity:0.15 },
  emptyCircle1:{ width:200, height:200, backgroundColor:ACCENT, top:0, left:-60 },
  emptyCircle2:{ width:140, height:140, backgroundColor:ACCENT, top:40, left:-20 },
  emptyCircle3:{ width:80, height:80, backgroundColor:ACCENT, top:80, left:20 },
  emptyState:{ alignItems:'center' },
  emptyIcoWrap:{ width:48, height:48, borderRadius:Radius.full, backgroundColor:'rgba(217,119,6,0.12)', alignItems:'center', justifyContent:'center', marginBottom:Spacing.md },
  emptyTxt:{ fontSize:17, fontWeight:'700', color:C.dark, marginBottom:Spacing.xs },
  emptySub:{ fontSize:13, color:C.muted, textAlign:'center', lineHeight:Spacing.xl, marginBottom:Spacing.lg, paddingHorizontal:Spacing.xl },
  emptyBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:ACCENT, borderRadius:Radius.xl, paddingVertical:Spacing.md, paddingHorizontal:Spacing.lg },
  emptyBtnTxt:{ fontSize:14, fontWeight:'700', color:C.white },

  // ── Body / Summary ──
  body:{ gap:Spacing.md },
  summaryCard:{ backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.md, borderWidth:1, borderColor:C.border, shadowColor:C.dark, shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:8, elevation:3 },
  summaryLabel:{ fontSize:11, fontWeight:'700', color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 },
  summaryAmount:{ fontSize:23, fontWeight:'800', color:C.dark, marginBottom:Spacing.sm },
  summaryRow:{ flexDirection:'row', alignItems:'center', marginBottom:Spacing.sm },
  summaryCol:{ flex:1 },
  summaryColVal:{ fontSize:14, fontWeight:'700', color:C.dark },
  summaryColLbl:{ fontSize:11, color:C.muted },
  summaryColDivider:{ width:1, height:28, backgroundColor:C.border, marginHorizontal:Spacing.md },
  summaryBarRow:{ flexDirection:'row', alignItems:'center', gap:Spacing.sm },
  summaryBarOuter:{ flex:1, height:4, backgroundColor:'#E8E8F0', borderRadius:2, overflow:'hidden' },
  summaryBarInner:{ height:'100%', borderRadius:2 },
  summaryPct:{ fontSize:12, fontWeight:'700', color:C.dark, width:32, textAlign:'right' },

  // ── Section Title ──
  sectionTitleRow:{ flexDirection:'row', alignItems:'center', marginTop:Spacing.xs, marginBottom:Spacing.sm },
  sectionTitle:{ fontSize:14, fontWeight:'700', color:C.text },

  // ── Card ──
  card:{ backgroundColor:C.white, borderRadius:Radius.md, padding:Spacing.sm, marginBottom:Spacing.sm, borderWidth:1, borderColor:C.border, shadowColor:C.dark, shadowOffset:{width:0,height:1}, shadowOpacity:0.04, shadowRadius:4, elevation:2 },
  cardAtteint:{ borderLeftWidth:3, borderLeftColor:C.green },
  cardTopRow:{ flexDirection:'row', alignItems:'center', marginBottom:4 },
  cardMenuBtn:{ width:22, height:22, borderRadius:Radius.full, backgroundColor:C.surface, alignItems:'center', justifyContent:'center' },
  cardTitre:{ fontSize:14, fontWeight:'600', color:C.dark, marginLeft:Spacing.xs, flex:1 },
  cardMontant:{ fontSize:12, fontWeight:'600', color:C.text, marginBottom:4 },
  cardBar:{ height:4, backgroundColor:'#E8E8F0', borderRadius:2, overflow:'hidden', marginBottom:4 },
  cardFill:{ height:'100%', borderRadius:2 },
  cardInfoRow:{ flexDirection:'row', alignItems:'center', gap:Spacing.sm, flexWrap:'wrap' },
  cardPct:{ fontSize:11, fontWeight:'700' },
  cardRestant:{ fontSize:10, color:C.muted },
  cardEcheance:{ fontSize:10, color:C.hint, marginLeft:'auto' },
  cardCreated:{ fontSize:10, color:C.hint },
  atteintBadge:{ flexDirection:'row', alignItems:'center', alignSelf:'flex-start', backgroundColor:'#ECFDF5', borderRadius:Radius.full, paddingVertical:3, paddingHorizontal:8, marginTop:Spacing.xs, gap:4 },
  atteintBadgeTxt:{ fontSize:11, fontWeight:'700', color:'#059669' },

  // ── FAB ──
  fabWrap:{ position:'absolute', right:Spacing.lg, alignItems:'center' },
  fab:{ width:48, height:48, borderRadius:Radius.full, backgroundColor:ACCENT, alignItems:'center', justifyContent:'center', shadowColor:ACCENT, shadowOffset:{width:0,height:4}, shadowOpacity:0.35, shadowRadius:Spacing.sm, elevation:8 },

  // ── Actions overlay / sheet ──
  blur:{ flex:1 },
  overlayActions:{ flex:1, justifyContent:'flex-end' },
  actionSheet:{ backgroundColor:C.white, borderTopLeftRadius:Radius.xl, borderTopRightRadius:Radius.xl, padding:Spacing.lg, paddingBottom:Spacing.xl },
  actionBtn:{ flexDirection:'row', alignItems:'center', paddingVertical:Spacing.md, gap:Spacing.md },
  actionBtnTxt:{ fontSize:15, fontWeight:'600', color:C.text },
  actionDivider:{ height:1, backgroundColor:C.border },

  // ── Modal ──
  overlay:{ flexGrow:1, justifyContent:'center', alignItems:'center', padding:Spacing.xl, paddingBottom:100 },
  modalCard:{ backgroundColor:C.white, borderRadius:Radius.xl, padding:Spacing.xl, width:'100%', maxWidth:360, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.15, shadowRadius:Spacing.xl, elevation:16 },
  modalHeader:{ flexDirection:'row', alignItems:'flex-start', marginBottom:Spacing.lg },
  modalHeaderText:{ flex:1 },
  closeBtn:{ width:32, height:32, borderRadius:Radius.full, backgroundColor:C.surface, alignItems:'center', justifyContent:'center', marginLeft:'auto' },
  closeBtnTxt:{ fontSize:15, fontWeight:'600', color:C.muted },
  modalTitle:{ fontSize:21, fontWeight:'800', color:C.dark },
  modalSub:{ fontSize:12, fontWeight:'700', color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6, marginTop:Spacing.md },
  input:{ backgroundColor:C.white, borderRadius:Radius.md, padding:Spacing.lg, fontSize:16, fontWeight:'600', color:C.dark, borderWidth:1.5, borderColor:C.border },
  modalActions:{ flexDirection:'row', gap:Spacing.md, marginTop:Spacing.xl },
  cancelBtn:{ flex:1, borderRadius:Radius.md, height:48, flexDirection:'row', gap:Spacing.sm, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:C.border, backgroundColor:C.white },
  cancelBtnPressed:{ borderColor:ACCENT, backgroundColor:'#F5F3FF' },
  cancelBtnTxt:{ fontSize:14, fontWeight:'700', color:C.muted },
  saveBtn:{ flex:1, borderRadius:Radius.md, height:48, flexDirection:'row', gap:Spacing.sm, alignItems:'center', justifyContent:'center', backgroundColor:ACCENT },
  saveBtnPressed:{ backgroundColor:'#6D28D9' },
  saveBtnTxt:{ fontSize:14, fontWeight:'700', color:C.white },
  btnHalf:{ flex:1, borderRadius:Radius.md },
  btnShadow:{ shadowColor:ACCENT, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
  sqRow:{ flexDirection:'row', gap:Spacing.xs, alignItems:'center' },
  sq:{ width:6, height:6, borderRadius:1.5, backgroundColor:ACCENT },
  sqLight:{ backgroundColor:'rgba(255,255,255,0.7)' },
  successWrap:{ alignItems:'center', paddingVertical:Spacing.xl },
  successCircle:{ width:64, height:64, borderRadius:32, backgroundColor:C.green, alignItems:'center', justifyContent:'center', marginBottom:Spacing.lg },
  successIcon:{ fontSize:29, color:C.white, fontWeight:'800' },
  successTitle:{ fontSize:21, fontWeight:'800', color:C.dark, marginBottom:Spacing.xs },

  // ── Alimenter ──
  alimSub:{ fontSize:13, color:C.muted, marginTop:4 },
  alimEmptyWrap:{ alignItems:'center', paddingVertical:Spacing.md },
  alimEmptyComptes:{ fontSize:13, color:C.hint, textAlign:'center', paddingVertical:Spacing.sm },
  alimEmptyHelp:{ fontSize:12, color:C.muted, textAlign:'center', lineHeight:Spacing.lg, marginBottom:Spacing.md },
  alimEmptyBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:ACCENT, borderRadius:Radius.md, paddingVertical:Spacing.sm, paddingHorizontal:Spacing.lg },
  alimEmptyBtnTxt:{ fontSize:13, fontWeight:'700', color:C.white },
  compteItem:{ flexDirection:'row', alignItems:'center', paddingVertical:Spacing.md, paddingHorizontal:Spacing.md, borderRadius:Radius.md, backgroundColor:C.surface, marginBottom:Spacing.xs, borderWidth:1, borderColor:C.border },
  compteItemActive:{ borderColor:ACCENT, backgroundColor:'#F5F3FF' },
  compteIco:{ fontSize:19, marginRight:Spacing.md },
  compteNom:{ fontSize:14, fontWeight:'600', color:C.dark },
  compteSolde:{ fontSize:12, color:C.muted },

  // ── Icône picker ──
  icoRow:{ flexDirection:'row', gap:Spacing.sm, marginBottom:Spacing.sm },
  icoItem:{ width:48, height:48, borderRadius:Radius.lg, backgroundColor:C.white, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:C.border, elevation:1, shadowColor:C.dark, shadowOpacity:0.04, shadowOffset:{width:0,height:1}, shadowRadius:2 },
  icoItemActive:{ borderColor:ACCENT, backgroundColor:'#F5F3FF', elevation:2, shadowColor:ACCENT, shadowOpacity:0.12, shadowOffset:{width:0,height:2}, shadowRadius:4 },
  icoCheck:{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:9, backgroundColor:ACCENT, alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:C.white },
  deleteBtn:{ flex:1, borderRadius:Radius.md, height:48, flexDirection:'row', gap:Spacing.sm, alignItems:'center', justifyContent:'center', backgroundColor:C.danger },
  deleteBtnPressed:{ backgroundColor:'#E63E54' },
  deleteBtnTxt:{ fontSize:14, fontWeight:'700', color:C.white },
  deleteMsg:{ fontSize:14, color:C.text, lineHeight:20, marginBottom:Spacing.md },

  // ── Historique ──
  histoEmpty:{ fontSize:13, color:C.hint, textAlign:'center', paddingVertical:Spacing.xl },
  histoItem:{ flexDirection:'row', alignItems:'center', paddingVertical:Spacing.md, borderBottomWidth:1, borderBottomColor:C.border },
  histoMt:{ fontSize:15, fontWeight:'700', color:C.dark },
  histoDate:{ fontSize:11, color:C.muted, marginTop:1 },
  histoCompte:{ fontSize:12, color:C.hint, textAlign:'right', maxWidth:120 },

  // ── Wizard ──
  wizardOverlay:{ flex:1, justifyContent:'flex-end', paddingTop: 70, backgroundColor:'rgba(0,0,0,0.45)' },
  wizardSheet:{ backgroundColor:C.white, borderTopLeftRadius:Radius.xl, borderTopRightRadius:Radius.xl, padding:Spacing.xl, maxHeight:'95%', elevation:20, shadowColor:C.dark, shadowOpacity:0.15, shadowOffset:{width:0,height:-4}, shadowRadius:12 },
  wizDragHandle:{ width:48, height:5, borderRadius:3, backgroundColor:'rgba(0,0,0,0.25)', alignSelf:'center', marginBottom:Spacing.xl },
  wizTopBar:{ flexDirection:'row', alignItems:'flex-start', gap:Spacing.md, marginBottom:Spacing.lg },
  wizProgressContainer:{ flex:1 },
  wizProgressLabel:{ fontSize:13, fontWeight:'700', color:C.muted, marginBottom:Spacing.sm },
  wizProgressOuter:{ height:4, backgroundColor:C.surface, borderRadius:2, overflow:'hidden' },
  wizProgressInner:{ height:'100%', backgroundColor:ACCENT, borderRadius:2 },
  wizCloseBtn:{ width:32, height:32, borderRadius:16, backgroundColor:C.surface, alignItems:'center', justifyContent:'center', marginTop:2 },
  wizContent:{ flexGrow:1 },
  wizStepTitle:{ fontSize:23, fontWeight:'800', color:C.dark, marginBottom:Spacing.lg, letterSpacing:-0.3 },
  wizHint:{ fontSize:12, color:C.hint, marginTop:Spacing.sm, textAlign:'center', fontStyle:'italic' },
  wizIcoHint:{ fontSize:12, color:C.hint, marginTop:Spacing.sm, marginBottom:Spacing.sm, fontStyle:'italic' },
  wizDotsRow:{ flexDirection:'row', justifyContent:'center', gap:Spacing.sm, marginBottom:Spacing.lg },
  wizDot:{ width:8, height:8, borderRadius:4, backgroundColor:C.border },
  wizDotActive:{ backgroundColor:ACCENT, width:24, borderRadius:4 },
  wizNav:{ flexDirection:'row', gap:Spacing.md, paddingTop:Spacing.lg, borderTopWidth:1, borderTopColor:C.border, marginTop:Spacing.md },
  wizBackBtn:{ flex:1, borderRadius:Radius.md, height:48, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:Spacing.xs, borderWidth:1.5, borderColor:C.border, backgroundColor:C.white },
  wizBackBtnTxt:{ fontSize:14, fontWeight:'700', color:C.muted },
  wizNextBtn:{ flex:1, borderRadius:Radius.md, height:48, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:Spacing.xs, backgroundColor:ACCENT, elevation:2, shadowColor:ACCENT, shadowOpacity:0.3, shadowOffset:{width:0,height:2}, shadowRadius:4 },
  wizNextBtnTxt:{ fontSize:14, fontWeight:'700', color:C.white },
  wizCreateBtn:{ flex:1, borderRadius:Radius.md, height:48, alignItems:'center', justifyContent:'center', flexDirection:'row', gap:Spacing.xs, backgroundColor:ACCENT, elevation:2, shadowColor:ACCENT, shadowOpacity:0.3, shadowOffset:{width:0,height:2}, shadowRadius:4 },
  wizCreateBtnTxt:{ fontSize:14, fontWeight:'700', color:C.white },
  wizCompteCard:{ flexDirection:'row', alignItems:'center', paddingVertical:Spacing.md, paddingHorizontal:Spacing.md, borderRadius:Radius.md, backgroundColor:C.white, marginBottom:Spacing.xs, borderWidth:1, borderColor:C.border, elevation:1, shadowColor:C.dark, shadowOpacity:0.05, shadowOffset:{width:0,height:1}, shadowRadius:2 },
  wizCompteCardActive:{ borderColor:ACCENT, backgroundColor:'#F5F3FF', elevation:2, shadowColor:ACCENT, shadowOpacity:0.12, shadowOffset:{width:0,height:2}, shadowRadius:4 },
  wizCompteIco:{ fontSize:19, marginRight:Spacing.md },
  wizCompteInfo:{ flex:1 },
  wizCompteNom:{ fontSize:14, fontWeight:'600', color:C.dark },
  wizCompteSolde:{ fontSize:12, color:C.muted },
  wizCheckbox:{ width:20, height:20, borderRadius:4, borderWidth:1.5, borderColor:C.muted, backgroundColor:C.white, alignItems:'center', justifyContent:'center' },
  wizCheckboxOn:{ backgroundColor:ACCENT, borderColor:ACCENT },
  wizCheckMark:{ fontSize:13, fontWeight:'800', color:C.white },
  wizSummaryCard:{ backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.lg, borderWidth:1, borderColor:C.border, elevation:1, shadowColor:C.dark, shadowOpacity:0.04, shadowOffset:{width:0,height:1}, shadowRadius:3 },
  wizSummaryRow:{ flexDirection:'row', alignItems:'center', paddingVertical:Spacing.md, borderBottomWidth:1, borderBottomColor:C.border },
  wizSummaryLabel:{ fontSize:13, fontWeight:'600', color:C.muted, flex:1 },
  wizSummaryValue:{ fontSize:14, fontWeight:'700', color:C.dark, textAlign:'right', maxWidth:'60%' },
  wizEmpty:{ fontSize:14, color:C.hint, textAlign:'center', paddingVertical:Spacing.xl },
  wizStep2Card:{ backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.lg, borderWidth:1, borderColor:C.border, elevation:1, shadowColor:C.dark, shadowOpacity:0.04, shadowOffset:{width:0,height:1}, shadowRadius:3 },
  wizStep2Row:{ flexDirection:'row', alignItems:'center', gap:Spacing.sm, marginBottom:Spacing.sm },
  wizStep2Label:{ fontSize:14, fontWeight:'700', color:C.dark },
  wizStep2AmountInput:{ backgroundColor:C.white, borderRadius:Radius.md, padding:Spacing.lg, fontSize:29, fontWeight:'800', color:C.dark, borderWidth:1.5, borderColor:C.border, textAlign:'center', marginBottom:Spacing.xs },
  wizStep2Fmt:{ fontSize:14, fontWeight:'600', color:C.muted, textAlign:'center', marginBottom:Spacing.md },
  wizStep2Divider:{ height:1, backgroundColor:C.border, marginVertical:Spacing.md },
  wizStep2Estimate:{ flexDirection:'row', alignItems:'flex-start', gap:Spacing.sm, backgroundColor:'#FFF9F0', borderRadius:Radius.md, padding:Spacing.md, marginTop:Spacing.md, borderWidth:1, borderColor:'#FFEDD5' },
  wizStep2EstimateText:{ flex:1, fontSize:13, fontWeight:'600', color:C.dark, lineHeight:18 },

  // ── Alimenter Wizard ──
  alimWizHeader:{ flexDirection:'row', alignItems:'center', gap:Spacing.md },
  alimWizHeaderInfo:{ flex:1 },
  alimWizHeaderTitre:{ fontSize:16, fontWeight:'700', color:C.dark },
  alimWizHeaderMontant:{ fontSize:12, color:C.muted, marginTop:1 },
  alimWizHeaderPctWrap:{ width:40, height:24, borderRadius:12, backgroundColor:C.surface, alignItems:'center', justifyContent:'center' },
  alimWizHeaderPct:{ fontSize:11, fontWeight:'800', color:ACCENT },
  alimWizProgressOuter:{ height:4, backgroundColor:C.surface, borderRadius:2, overflow:'hidden', marginBottom:Spacing.lg },
  alimWizProgressInner:{ height:'100%', backgroundColor:ACCENT, borderRadius:2 },
  alimWizCompteCard:{ flexDirection:'row', alignItems:'center', paddingVertical:Spacing.md, paddingHorizontal:Spacing.md, borderRadius:Radius.md, backgroundColor:C.white, marginBottom:Spacing.xs, borderWidth:1, borderColor:C.border, elevation:1, shadowColor:C.dark, shadowOpacity:0.05, shadowOffset:{width:0,height:1}, shadowRadius:2 },
  alimWizCompteCardActive:{ borderColor:ACCENT, backgroundColor:'#F5F3FF', elevation:2, shadowColor:ACCENT, shadowOpacity:0.12, shadowOffset:{width:0,height:2}, shadowRadius:4 },
  alimWizRadio:{ width:20, height:20, borderRadius:10, borderWidth:1.5, borderColor:C.muted, backgroundColor:C.white, alignItems:'center', justifyContent:'center' },
  alimWizRadioOn:{ borderColor:ACCENT },
  alimWizRadioDot:{ width:10, height:10, borderRadius:5, backgroundColor:ACCENT },
  alimWizSoldeRestant:{ backgroundColor:C.surface, borderRadius:Radius.md, padding:Spacing.md, marginTop:Spacing.md, borderWidth:1, borderColor:C.border },
  alimWizSoldeRow:{ flexDirection:'row', alignItems:'center', gap:Spacing.sm },
  alimWizSoldeLabel:{ flex:1, fontSize:13, fontWeight:'600', color:C.muted },
  alimWizSoldeVal:{ fontSize:13, fontWeight:'800', color:C.dark },
  alimWizSoldeArrow:{ fontSize:17, color:C.muted, textAlign:'center', marginVertical:Spacing.xs },
  alimWizSuccessSub:{ fontSize:14, color:C.muted, textAlign:'center', marginTop:Spacing.xs },
  alimAtteintBadge:{ alignSelf:'center', backgroundColor:C.green, borderRadius:20, paddingVertical:Spacing.sm, paddingHorizontal:Spacing.lg, marginTop:Spacing.md },
  alimAtteintBadgeTxt:{ fontSize:15, fontWeight:'800', color:C.white },
  alimAtteintActions:{ flexDirection:'row', gap:Spacing.md, marginTop:Spacing.lg, width:'100%' },
  alimAtteintBtn:{ flex:1, borderRadius:Radius.md, height:44, alignItems:'center', justifyContent:'center', backgroundColor:ACCENT },
  alimAtteintBtnTxt:{ fontSize:13, fontWeight:'700', color:C.white },
  alimAtteintBtnSecondary:{ flex:1, borderRadius:Radius.md, height:44, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:C.border, backgroundColor:C.white },
  alimAtteintBtnSecondaryTxt:{ fontSize:13, fontWeight:'700', color:C.muted },

  // ── Alimenter Recap (étape 3) ──
  alimRecapHeader:{ flexDirection:'row', alignItems:'center', gap:Spacing.md, backgroundColor:C.white, borderRadius:Radius.lg, padding:Spacing.lg, marginBottom:Spacing.md, borderWidth:1, borderColor:C.border, elevation:2, shadowColor:C.dark, shadowOpacity:0.06, shadowOffset:{width:0,height:2}, shadowRadius:6 },
  alimRecapHeaderTitre:{ fontSize:16, fontWeight:'700', color:C.dark, marginBottom:2 },
  alimRecapHeaderProgress:{ fontSize:13, color:C.muted, fontWeight:'500' },
  alimRecapCard:{ backgroundColor:C.white, borderRadius:Radius.lg, overflow:'hidden', borderWidth:1, borderColor:C.border, elevation:1, shadowColor:C.dark, shadowOpacity:0.04, shadowOffset:{width:0,height:1}, shadowRadius:3 },
  alimRecapRow:{ flexDirection:'row', alignItems:'center', paddingVertical:Spacing.md, paddingHorizontal:Spacing.lg, gap:Spacing.sm },
  alimRecapLabel:{ flex:1, fontSize:13, fontWeight:'600', color:C.muted },
  alimRecapValue:{ fontSize:14, fontWeight:'700', color:C.dark, textAlign:'right' },
  alimRecapMontant:{ fontSize:20, fontWeight:'800', color:ACCENT, textAlign:'right' },
  alimRecapDivider:{ height:1, backgroundColor:C.border, marginLeft:44 },
}), [C]);
  const [objectifs, setObjectifs] = useState<any[]>([]);
  const [comptes, setComptes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [titre, setTitre] = useState('');
  const [icone, setIcone] = useState('bullseye-outline');
  const [montantCible, setMontantCible] = useState('');
  const [dateLimite, setDateLimite] = useState('');
  const [saving, setSaving] = useState(false);
  const [dotButton, setDotButton] = useState<'cancel'|'save'|'alimenter'|null>(null);
  const [success, setSuccess] = useState(false);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizTitre, setWizTitre] = useState('');
  const [wizIcone, setWizIcone] = useState('bullseye-outline');
  const [wizDescription, setWizDescription] = useState('');
  const [wizMontant, setWizMontant] = useState('');
  const [wizDateLimite, setWizDateLimite] = useState('');
  const [wizSelectedComptes, setWizSelectedComptes] = useState<number[]>([]);
  const [wizSaving, setWizSaving] = useState(false);
  const [wizSuccess, setWizSuccess] = useState(false);

  // Alimenter Wizard
  const [showAlimWizard, setShowAlimWizard] = useState(false);
  const [alimStep, setAlimStep] = useState(1);
  const [alimTarget, setAlimTarget] = useState<any>(null);
  const [alimCompteId, setAlimCompteId] = useState<number|null>(null);
  const [alimMontant, setAlimMontant] = useState('');
  const [alimSaving, setAlimSaving] = useState(false);
  const [alimSuccess, setAlimSuccess] = useState(false);
  const [alimAtteint, setAlimAtteint] = useState(false);
  const [archiverSaving, setArchiverSaving] = useState(false);

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // Historique
  const [showHisto, setShowHisto] = useState(false);
  const [histoTarget, setHistoTarget] = useState<any>(null);
  const [histoData, setHistoData] = useState<any[]>([]);
  const [histoLoading, setHistoLoading] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [showObjMenu, setShowObjMenu] = useState(false);
  const [selectedObjForMenu, setSelectedObjForMenu] = useState<any>(null);
  const cardAnim = useSharedValue(0);
  const barAnim = useSharedValue(0);
  const cardStyleAnim = useAnimatedStyle(() => ({
    opacity: cardAnim.value,
    transform: [{ translateY: (1 - cardAnim.value) * 30 }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: barAnim.value,
  }));
  const cardEntry = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const cancelDotSlide = useSharedValue(0);
  const saveDotSlide = useSharedValue(0);
  const alimDotSlide = useSharedValue(0);

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
  const alimDot1 = useAnimatedStyle(() => ({ transform: [{ translateX: alimDotSlide.value }] }));
  const alimDot2 = useAnimatedStyle(() => ({ transform: [{ translateX: -alimDotSlide.value }] }));

  // Alimenter Wizard animations
  const alimWizSlide = useSharedValue(1);
  const alimWizProgress = useSharedValue(0.33);
  const alimWizCheckScale = useSharedValue(0);
  const alimWizProgressStyle = useAnimatedStyle(() => ({
    width: `${alimWizProgress.value * 100}%`,
  }));
  const alimWizCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: alimWizCheckScale.value }],
  }));
  const keyboardSlide = useSharedValue(0);

  // Wizard animations
  const wizardSlide = useSharedValue(1);
  const wizardProgress = useSharedValue(0.25);
  const wizardCheckScale = useSharedValue(0);
  const wizardProgressStyle = useAnimatedStyle(() => ({
    width: `${wizardProgress.value * 100}%`,
  }));
  const wizardCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wizardCheckScale.value }],
  }));

  // Drag-to-dismiss shared values and styles
  const wizardDragY = useSharedValue(0);
  const alimWizDragY = useSharedValue(0);
  const wizSheetCombined = useAnimatedStyle(() => ({
    transform: [{ translateY: wizardSlide.value * WIN_H + Math.max(0, wizardDragY.value) - keyboardSlide.value }],
  }));
  const alimWizSheetCombined = useAnimatedStyle(() => ({
    transform: [{ translateY: alimWizSlide.value * WIN_H + Math.max(0, alimWizDragY.value) - keyboardSlide.value }],
  }));

  const closeWizard = () => {
    wizardSlide.value = withTiming(1, { duration: 250 });
    wizardDragY.value = 0;
    setTimeout(() => { setShowWizard(false); }, 250);
  };
  const closeAlimWizard = () => {
    alimWizSlide.value = withTiming(1, { duration: 250 });
    alimWizDragY.value = 0;
    setTimeout(() => { setShowAlimWizard(false); }, 250);
  };

  const wizPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10,
    onPanResponderGrant: () => { wizardDragY.value = 0; },
    onPanResponderMove: (_, gs) => {
      if (gs.dy > 0) wizardDragY.value = gs.dy * 0.35;
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 100) {
        wizardSlide.value = withTiming(1, { duration: 200 });
        wizardDragY.value = 0;
        setTimeout(() => setShowWizard(false), 200);
      } else {
        wizardDragY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    },
    onPanResponderTerminate: () => {
      wizardDragY.value = withSpring(0, { damping: 20 });
    },
  })).current;

  const alimPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10,
    onPanResponderGrant: () => { alimWizDragY.value = 0; },
    onPanResponderMove: (_, gs) => {
      if (gs.dy > 0) alimWizDragY.value = gs.dy * 0.35;
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 100) {
        alimWizSlide.value = withTiming(1, { duration: 200 });
        alimWizDragY.value = 0;
        setTimeout(() => setShowAlimWizard(false), 200);
      } else {
        alimWizDragY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    },
    onPanResponderTerminate: () => {
      alimWizDragY.value = withSpring(0, { damping: 20 });
    },
  })).current;

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
    const show = Keyboard.addListener('keyboardDidShow', e => { keyboardSlide.value = e.endCoordinates.height; });
    const hide = Keyboard.addListener('keyboardDidHide', () => { keyboardSlide.value = 0; });
    return () => { show.remove(); hide.remove(); };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const o = await api.objectifs.list();
      setObjectifs(Array.isArray(o) ? o : []);
    } catch {
      setObjectifs([]);
    }
    try {
      const c = await api.comptes.list();
      setComptes(Array.isArray(c) ? c : []);
    } catch {
      setComptes([]);
    }
    setLoading(false);
    cardAnim.value = 0;
    barAnim.value = 0;
    setTimeout(() => {
      cardAnim.value = withSpring(1, { damping: 14, stiffness: 100 });
      setTimeout(() => { barAnim.value = withTiming(1, { duration: 600 }); }, 200);
    }, 50);
  };

  useEffect(() => { load(); }, []);

  const filteredObjectifs = objectifs;

  const totalCible = filteredObjectifs.reduce((a, o) => a + parseFloat(o.montant_cible||0), 0);
  const totalActuel = filteredObjectifs.reduce((a, o) => a + parseFloat(o.montant_actuel||0), 0);
  const globalPct = totalCible > 0 ? Math.round((totalActuel / totalCible) * 100) : 0;
  const activeCount = filteredObjectifs.filter(o => o.statut !== 'annule').length;

  const openAdd = () => {
    setEditing(null);
    setWizardStep(1);
    setWizTitre('');
    setWizIcone('bullseye-outline');
    setWizDescription('');
    setWizMontant('');
    setWizDateLimite('');
    setWizSelectedComptes([]);
    setWizSuccess(false);
    setWizSaving(false);
    setShowWizard(true);
    wizardSlide.value = 1;
    wizardProgress.value = 0.25;
    setTimeout(() => {
      wizardSlide.value = withSpring(0, { damping: 18, stiffness: 120 });
      wizardProgress.value = withTiming(0.25, { duration: 300 });
    }, 50);
  };

  const openEdit = (obj: any) => {
    setEditing(obj);
    setTitre(obj.titre || '');
    setIcone(obj.icone || 'bullseye-outline');
    setMontantCible(String(obj.montant_cible || 0));
    setDateLimite(obj.date_limite ? obj.date_limite.split('T')[0] : '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!titre.trim()) { Alert.alert('Erreur', 'Le titre est requis'); return; }
    const mt = parseInt(montantCible);
    if (!mt || mt <= 0) { Alert.alert('Erreur', 'Montant cible invalide'); return; }
    setSaving(true);
    try {
      const data: any = { titre: titre.trim(), montant_cible: mt, icone };
      if (dateLimite.trim()) data.date_limite = dateLimite.trim();
      if (editing) {
        await api.objectifs.update(editing.id, data);
      } else {
        await api.objectifs.create(data);
      }
      await new Promise(r => setTimeout(r, 400));
      setSaving(false);
      setSuccess(true);
      checkScale.value = withSpring(1, { damping: 8, stiffness: 150 });
      showToast({ type: 'success', titre: editing ? 'Objectif modifié' : 'Objectif créé', message: `${titre.trim()} · ${fmt(mt)}`, icone: '🎯' });
      notify('success', editing ? 'Objectif modifié' : 'Objectif créé', `${titre.trim()} · ${fmt(mt)}`);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
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

  const handleWizardNext = () => {
    if (wizardStep === 1) {
      if (!wizTitre.trim()) { Alert.alert('Erreur', 'Le nom de l\'objectif est requis'); return; }
    } else if (wizardStep === 2) {
      const mt = parseInt(wizMontant);
      if (!mt || mt <= 0) { Alert.alert('Erreur', 'Montant cible invalide'); return; }
    }
    const next = wizardStep + 1;
    setWizardStep(next);
    wizardProgress.value = withTiming(next / 4, { duration: 300 });
  };

  const handleWizardBack = () => {
    const prev = wizardStep - 1;
    setWizardStep(prev);
    wizardProgress.value = withTiming(prev / 4, { duration: 300 });
  };

  const handleWizardCreate = async () => {
    if (!wizTitre.trim()) { Alert.alert('Erreur', 'Le nom de l\'objectif est requis'); return; }
    const mt = parseInt(wizMontant);
    if (!mt || mt <= 0) { Alert.alert('Erreur', 'Montant cible invalide'); return; }
    setWizSaving(true);
    try {
      const data: any = { titre: wizTitre.trim(), montant_cible: mt, icone: wizIcone };
      if (wizDateLimite.trim()) data.date_limite = wizDateLimite.trim();
      await api.objectifs.create(data);
      await new Promise(r => setTimeout(r, 400));
      setWizSaving(false);
      setWizSuccess(true);
      wizardCheckScale.value = withSpring(1, { damping: 8, stiffness: 150 });
      showToast({ type: 'success', titre: 'Objectif créé', message: `${wizTitre.trim()} · ${fmt(mt)}`, icone: '🎯' });
      notify('success', 'Objectif créé', `${wizTitre.trim()} · ${fmt(mt)}`);
      setTimeout(() => {
        setShowWizard(false);
        setWizSuccess(false);
        wizardCheckScale.value = 0;
        wizardSlide.value = 1;
        load();
      }, 600);
    } catch (e: any) {
      setWizSaving(false);
      Alert.alert('Erreur', e.message || 'Impossible d\'enregistrer');
    }
  };

  const openAlimenter = (obj: any) => {
    setAlimTarget(obj);
    setAlimStep(1);
    setAlimCompteId(null);
    setAlimMontant('');
    setAlimSuccess(false);
    setAlimAtteint(false);
    setAlimSaving(false);
    setShowAlimWizard(true);
    alimWizSlide.value = 1;
    alimWizProgress.value = 0.33;
    setTimeout(() => {
      alimWizSlide.value = withSpring(0, { damping: 18, stiffness: 120 });
      alimWizProgress.value = withTiming(0.33, { duration: 300 });
    }, 50);
  };

  const handleAlimNext = () => {
    if (alimStep === 1) {
      if (!alimCompteId) { Alert.alert('Erreur', 'Veuillez sélectionner un compte'); return; }
    } else if (alimStep === 2) {
      const mt = parseInt(alimMontant);
      if (!mt || mt <= 0) { Alert.alert('Erreur', 'Montant invalide'); return; }
      const compte = comptes.find(c => c.id === alimCompteId);
      if (compte && mt > parseFloat(compte.solde_actuel)) {
        Alert.alert('Solde insuffisant', `Le solde disponible (${fmt(compte.solde_actuel)}) est insuffisant pour ce versement.`);
        return;
      }
    }
    const next = alimStep + 1;
    setAlimStep(next);
    alimWizProgress.value = withTiming(next / 3, { duration: 300 });
  };

  const handleAlimBack = () => {
    const prev = alimStep - 1;
    setAlimStep(prev);
    alimWizProgress.value = withTiming(prev / 3, { duration: 300 });
  };

  const handleAlimConfirm = async () => {
    const mt = parseInt(alimMontant);
    if (!mt || mt <= 0) { Alert.alert('Erreur', 'Montant invalide'); return; }
    if (!alimCompteId) { Alert.alert('Erreur', 'Veuillez sélectionner un compte'); return; }
    if (!alimTarget) { Alert.alert('Erreur', 'Aucun objectif sélectionné'); return; }
    setAlimSaving(true);
    try {
      const updatedObj = await api.objectifs.alimenter(alimTarget.id, { compte_id: alimCompteId, montant: mt });
      await new Promise(r => setTimeout(r, 400));
      const atteint = updatedObj?.statut === 'atteint';
      setAlimSaving(false);
      setAlimSuccess(true);
      setAlimAtteint(atteint);
      alimWizCheckScale.value = withSpring(1, { damping: 8, stiffness: 150 });
      showToast({ type: atteint ? 'success' : 'success', titre: atteint ? 'Objectif atteint !' : 'Objectif alimenté', message: `${alimTarget.titre} · ${fmt(mt)}`, icone: atteint ? '🎉' : '💰' });
      notify(atteint ? 'success' : 'info', atteint ? 'Objectif atteint !' : 'Objectif alimenté', `${alimTarget.titre} · ${fmt(mt)}`);
      if (!atteint) {
        setTimeout(() => {
          setShowAlimWizard(false);
          setAlimSuccess(false);
          alimWizCheckScale.value = 0;
          alimWizSlide.value = 1;
          load();
        }, 1200);
      }
    } catch (e: any) {
      setAlimSaving(false);
      const msg = e?.message || '';
      if (msg.includes('Solde insuffisant')) {
        Alert.alert('Solde insuffisant', 'Le solde de ce compte est insuffisant pour effectuer cette opération.');
      } else if (msg.includes('introuvable')) {
        Alert.alert('Introuvable', 'L\'objectif ou le compte sélectionné n\'existe plus.');
      } else {
        Alert.alert('Erreur', msg || 'Impossible d\'alimenter. Vérifie que le serveur est bien lancé.');
      }
    }
  };

  const handleAlimContinuer = () => {
    setShowAlimWizard(false);
    setAlimSuccess(false);
    setAlimAtteint(false);
    alimWizCheckScale.value = 0;
    alimWizSlide.value = 1;
    load();
  };

  const handleArchiver = async () => {
    if (!alimTarget) return;
    setArchiverSaving(true);
    try {
      const currentObj = await api.objectifs.get(alimTarget.id);
      if (!currentObj || parseFloat(currentObj.montant_actuel || 0) < parseFloat(currentObj.montant_cible || 0)) {
        setArchiverSaving(false);
        Alert.alert('Impossible', "Le montant cible n'est pas encore atteint.");
        return;
      }
      await api.objectifs.update(alimTarget.id, { statut: 'atteint' });
      setShowAlimWizard(false);
      setAlimSuccess(false);
      setAlimAtteint(false);
      setArchiverSaving(false);
      alimWizCheckScale.value = 0;
      alimWizSlide.value = 1;
      load();
    } catch (e: any) {
      setArchiverSaving(false);
      Alert.alert('Erreur', e.message || 'Impossible d\'archiver');
    }
  };

  const openDelete = (obj: any) => {
    setDeleteTarget(obj);
    setShowDelete(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.objectifs.remove(deleteTarget.id);
      setShowDelete(false);
      Alert.alert('🗑️ Supprimé', 'Objectif supprimé avec succès');
      showToast({ type: 'info', titre: 'Objectif supprimé', message: `${deleteTarget.titre}`, icone: '🗑️' });
      notify('info', 'Objectif supprimé', `${deleteTarget.titre}`);
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de supprimer');
    } finally {
      setDeleting(false);
    }
  };

  const openHisto = async (obj: any) => {
    setHistoTarget(obj);
    setHistoData([]);
    setShowHisto(true);
    setHistoLoading(true);
    try {
      const data = await api.objectifs.alimentations(obj.id);
      setHistoData(Array.isArray(data) ? data : []);
    } catch {}
    setHistoLoading(false);
  };

  const formatDelai = (d: string) => {
    if (!d) return '';
    const now = new Date();
    const limit = new Date(d);
    const diff = limit.getTime() - now.getTime();
    if (diff <= 0) return 'Date dépassée';
    const jours = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (jours >= 30) {
      const mois = Math.floor(jours / 30);
      return `${mois} mois restant${mois > 1 ? 's' : ''}`;
    }
    return `Échéance dans ${jours} jour${jours > 1 ? 's' : ''}`;
  };

  const formatDateCreation = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    const mois = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    return `${date.getDate()} ${mois[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatDateFull = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    const days = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const pct = (obj: any) => {
    const cible = parseFloat(obj.montant_cible||1);
    const actuel = parseFloat(obj.montant_actuel||0);
    return Math.min(100, Math.round((actuel / cible) * 100));
  };

  return (
    <ScreenWrapper style={{ backgroundColor: C.bg }}>
      <StatusBar style="light" />

      <PageHeader
        title="Objectifs financiers"
        icon="🎯"
        color={C.dark}
        right={
          <TouchableOpacity onPress={()=>setShowMenu(true)} style={s.menuBtn} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color="#FFF" />
          </TouchableOpacity>
        }
      />

      {/* ── Header Menu ──────────────── */}
      <Modal visible={showMenu} transparent animationType="none" onRequestClose={()=>setShowMenu(false)}>
        <BlurView intensity={15} tint="dark" style={s.blur}>
          <Pressable style={s.overlayActions} onPress={()=>setShowMenu(false)}>
            <Pressable onPress={()=>{}} style={s.actionSheet}>
              <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowMenu(false); openAdd();}} activeOpacity={0.7}>
                <Ionicons name="add-outline" size={16} color={C.text} />
                <Text style={s.actionBtnTxt}>Créer un objectif</Text>
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
        ) : filteredObjectifs.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={s.emptyDecor}>
              <View style={[s.emptyCircle, s.emptyCircle1]} />
              <View style={[s.emptyCircle, s.emptyCircle2]} />
              <View style={[s.emptyCircle, s.emptyCircle3]} />
            </View>
            <View style={s.emptyState}>
              <View style={s.emptyIcoWrap}>
                <Ionicons name="flag-outline" size={26} color={ACCENT} />
              </View>
              <Text style={s.emptyTxt}>Aucun objectif financier.</Text>
              <Text style={s.emptySub}>
                Commencez à préparer vos projets d'avenir.
              </Text>
              <TouchableOpacity style={s.emptyBtn} onPress={openAdd} activeOpacity={0.85}>
                <Ionicons name="add-outline" size={16} color={C.white} style={{marginRight:4}} />
                <Text style={s.emptyBtnTxt}>Créer mon premier objectif</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.body}>
            <Animated.View style={[s.summaryCard, cardStyleAnim]}>
              <Text style={s.summaryLabel}>Tous les objectifs</Text>
              <Text style={s.summaryAmount}>{activeCount} objectif{activeCount > 1 ? 's' : ''}</Text>

              <View style={s.summaryRow}>
                <View style={s.summaryCol}>
                  <Text style={s.summaryColVal}>{fmt(totalCible)}</Text>
                  <Text style={s.summaryColLbl}>À atteindre</Text>
                </View>
                <View style={s.summaryColDivider} />
                <View style={s.summaryCol}>
                  <Text style={s.summaryColVal}>{fmt(totalActuel)}</Text>
                  <Text style={s.summaryColLbl}>Épargné</Text>
                </View>
              </View>

              <View style={s.summaryBarRow}>
                <View style={s.summaryBarOuter}>
                  <Animated.View style={[s.summaryBarInner, barStyle, { width: `${Math.min(globalPct,100)}%`, backgroundColor: globalPct >= 100 ? C.green : ACCENT }]} />
                </View>
                <Text style={s.summaryPct}>{globalPct}%</Text>
              </View>
            </Animated.View>

            <View style={s.sectionTitleRow}>
              <Ionicons name="flag-outline" size={12} color={C.text} style={{marginRight:4}} />
              <Text style={s.sectionTitle}>Mes objectifs</Text>
            </View>

            {filteredObjectifs.map((obj, i) => {
              const cp = pct(obj);
              const restant = Math.max(0, parseFloat(obj.montant_cible||0) - parseFloat(obj.montant_actuel||0));
              const isAtteint = obj.statut === 'atteint' || cp >= 100;
              return (
                <View key={obj.id||i} style={[s.card, isAtteint && s.cardAtteint]}>
                  <View style={s.cardTopRow}>
                    <Ionicons name={toIcon(obj.icone) as any} size={16} color={C.text} style={{width:24, textAlign:'center'}} />
                    <Text style={s.cardTitre} numberOfLines={1}>{obj.titre}</Text>
                    <View style={{flex:1}} />
                    <TouchableOpacity onPress={() => { setSelectedObjForMenu(obj); setShowObjMenu(true); }} style={s.cardMenuBtn} hitSlop={6}>
                      <Ionicons name="ellipsis-vertical" size={12} color={C.muted} />
                    </TouchableOpacity>
                  </View>

                  <Text style={s.cardMontant}>{fmt(obj.montant_actuel)} / {fmt(obj.montant_cible)}</Text>

                  <View style={s.cardBar}>
                    <View style={[s.cardFill, { width: `${Math.min(cp,100)}%`, backgroundColor: cp >= 100 ? C.green : cp > 70 ? C.warning : ACCENT }]} />
                  </View>

                  <View style={s.cardInfoRow}>
                    <Text style={[s.cardPct, {color: cp >= 100 ? C.green : cp > 70 ? C.warning : C.muted}]}>{cp}%</Text>
                    {!isAtteint && restant > 0 && (
                      <Text style={s.cardRestant}>Reste : {fmt(restant)}</Text>
                    )}
                    {!isAtteint && obj.date_limite && (
                      <Text style={s.cardEcheance}>Échéance : {formatDelai(obj.date_limite)}</Text>
                    )}
                    {obj.created_at && (
                      <Text style={s.cardCreated}>Créé le {formatDateCreation(obj.created_at)}</Text>
                    )}
                  </View>

                  {isAtteint && (
                    <View style={s.atteintBadge}>
                      <Text style={s.atteintBadgeTxt}>✅ Objectif atteint</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── FAB ───────────────────────────── */}
      {filteredObjectifs.length > 0 && (
        <View style={[s.fabWrap, { bottom: FAB_BOTTOM }]}>
          <TouchableOpacity style={s.fab} onPress={openAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={24} color={C.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Objectif Menu (⋮) ──────────── */}
      <Modal visible={showObjMenu} transparent animationType="none" onRequestClose={()=>setShowObjMenu(false)}>
        <BlurView intensity={15} tint="dark" style={s.blur}>
          <Pressable style={s.overlayActions} onPress={()=>setShowObjMenu(false)}>
            <Pressable onPress={()=>{}} style={s.actionSheet}>
              <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowObjMenu(false); if (selectedObjForMenu) openAlimenter(selectedObjForMenu);}} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={16} color={C.text} />
                <Text style={s.actionBtnTxt}>Alimenter l'objectif</Text>
              </TouchableOpacity>
              <View style={s.actionDivider} />
              <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowObjMenu(false); if (selectedObjForMenu) openEdit(selectedObjForMenu);}} activeOpacity={0.7}>
                <Ionicons name="pencil-outline" size={16} color={C.text} />
                <Text style={s.actionBtnTxt}>Modifier</Text>
              </TouchableOpacity>
              <View style={s.actionDivider} />
              <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowObjMenu(false); if (selectedObjForMenu) openHisto(selectedObjForMenu);}} activeOpacity={0.7}>
                <Ionicons name="list-outline" size={16} color={C.text} />
                <Text style={s.actionBtnTxt}>Voir les opérations</Text>
              </TouchableOpacity>
              <View style={s.actionDivider} />
              <TouchableOpacity style={s.actionBtn} onPress={()=>{setShowObjMenu(false); if (selectedObjForMenu) openDelete(selectedObjForMenu);}} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={16} color={C.danger} />
                <Text style={[s.actionBtnTxt, {color: C.danger}]}>Supprimer</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </BlurView>
      </Modal>

      {/* ── Modal Créer / Modifier ── */}
      <Modal visible={showModal} transparent animationType="none" onRequestClose={()=>setShowModal(false)}>
        <View style={{flex:1, position:'relative'}}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
          <BlurView intensity={15} tint="dark" style={s.blur}>
            <ScrollView contentContainerStyle={s.overlay} keyboardShouldPersistTaps="handled">
              <Animated.View style={[s.modalCard, cardStyle]}>
                {success ? (
                  <View style={s.successWrap}>
                    <Animated.View style={[s.successCircle, checkStyle]}>
                      <Text style={s.successIcon}>✓</Text>
                    </Animated.View>
                    <Text style={s.successTitle}>{editing ? 'Objectif modifié !' : 'Objectif créé !'}</Text>
                  </View>
                ) : (
                  <>
                    <View style={s.modalHeader}>
                      <View style={s.modalHeaderText}>
                        <Text style={s.modalTitle}>{editing ? '✏️ Modifier' : '🎯 Nouvel objectif'}</Text>
                      </View>
                      <Pressable onPress={()=>setShowModal(false)} style={s.closeBtn} hitSlop={8}>
                        <Text style={s.closeBtnTxt}>✕</Text>
                      </Pressable>
                    </View>

                    <Text style={s.modalSub}>Icône</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.icoRow}>
                      {ICONES.map(ico => (
                        <Pressable
                          key={ico}
                          onPress={() => setIcone(ico)}
                          style={[s.icoItem, icone === ico && s.icoItemActive]}
                        >
                          <Ionicons name={ico as any} size={22} color={C.dark} />
                          {icone === ico && (
                            <View style={s.icoCheck}><Ionicons name="checkmark" size={10} color={C.white} /></View>
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>

                    <Text style={s.modalSub}>Titre</Text>
                    <TextInput
                      style={s.input}
                      value={titre}
                      onChangeText={setTitre}
                      placeholder="Ex: Voyage à Bali"
                      placeholderTextColor={C.hint}
                    />

                    <Text style={s.modalSub}>Montant cible (FCFA)</Text>
                    <TextInput
                      style={s.input}
                      value={montantCible}
                      onChangeText={setMontantCible}
                      placeholder="Ex: 1200000"
                      placeholderTextColor={C.hint}
                      keyboardType="numeric"
                    />

                    <Text style={s.modalSub}>Date limite (optionnelle)</Text>
                    <TextInput
                      style={s.input}
                      value={dateLimite}
                      onChangeText={setDateLimite}
                      placeholder="Ex: 2026-12-31"
                      placeholderTextColor={C.hint}
                    />

                    <View style={s.modalActions}>
                      <Animated.View style={[s.btnHalf]}>
                        <Pressable
                          style={({pressed})=>[s.cancelBtn, pressed&&s.cancelBtnPressed]}
                          onPress={()=>setShowModal(false)}
                          onPressIn={()=>{
                            setDotButton('cancel');
                            cancelDotSlide.value = withRepeat(
                              withTiming(4,{duration:600,easing:Easing.inOut(Easing.sin)}),
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
                          <Text style={s.cancelBtnTxt}>Annuler</Text>
                        </Pressable>
                      </Animated.View>
                      <Animated.View style={[s.btnHalf, s.btnShadow]}>
                        <Pressable
                          style={({pressed})=>[s.saveBtn, pressed&&s.saveBtnPressed]}
                          onPress={handleSave}
                          disabled={saving}
                          onPressIn={()=>{
                            setDotButton('save');
                            saveDotSlide.value = withRepeat(
                              withTiming(4,{duration:600,easing:Easing.inOut(Easing.sin)}),
                              -1,true
                            );
                          }}
                          onPressOut={()=>saveDotSlide.value=withSpring(1,{damping:8,stiffness:200})}
                        >
                          {saving ? <ActivityIndicator color={C.white} size="small" /> : (
                            <>
                              {dotButton==='save' && (
                                <View style={s.sqRow}>
                                  <Animated.View style={[s.sq, s.sqLight, saveDot1]} />
                                  <Animated.View style={[s.sq, s.sqLight, saveDot2]} />
                                </View>
                              )}
                              <Text style={s.saveBtnTxt}>Enregistrer</Text>
                            </>
                          )}
                        </Pressable>
                      </Animated.View>
                    </View>
                  </>
                )}
              </Animated.View>
            </ScrollView>
          </BlurView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Wizard Création ────────────── */}
      <Modal visible={showWizard} transparent animationType="none" onRequestClose={closeWizard}>
        <View style={{flex:1, position:'relative'}}>
          <View style={s.wizardOverlay}>
            <Pressable style={{flex:1, justifyContent:'flex-end'}} onPress={closeWizard}>
              <Pressable onPress={()=>{}}>
              <Animated.View style={[s.wizardSheet, wizSheetCombined]} {...wizPanResponder.panHandlers}>
                <View style={s.wizDragHandle} />
                {wizSuccess ? (
                  <View style={s.successWrap}>
                    <Animated.View style={[s.successCircle, wizardCheckStyle]}>
                      <Text style={s.successIcon}>✓</Text>
                    </Animated.View>
                    <Text style={s.successTitle}>Objectif créé !</Text>
                  </View>
                ) : (
                  <>
                    {/* Header */}
                    <View style={s.wizTopBar}>
                      <View style={{flex:1}}>
                        <View style={s.wizProgressContainer}>
                          <Text style={s.wizProgressLabel}>Étape {wizardStep} sur 4</Text>
                          <View style={s.wizProgressOuter}>
                            <Animated.View style={[s.wizProgressInner, wizardProgressStyle]} />
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity onPress={closeWizard} style={s.wizCloseBtn} hitSlop={8} activeOpacity={0.7}>
                        <Ionicons name="close" size={18} color={C.muted} />
                      </TouchableOpacity>
                    </View>

                    {/* Step dots */}
                    <View style={s.wizDotsRow}>
                      {[1,2,3,4].map(step => (
                        <View key={step} style={[s.wizDot, step <= wizardStep && s.wizDotActive]} />
                      ))}
                    </View>

                    <ScrollView style={s.wizContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                      {/* ── Étape 1 : Informations générales ── */}
                      {wizardStep === 1 && (
                        <View>
                          <Text style={s.wizStepTitle}>📋 Informations générales</Text>
                          <Text style={s.modalSub}>Icône</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.icoRow}>
                            {ICONES.map(ico => (
                              <Pressable key={ico} onPress={() => setWizIcone(ico)} style={[s.icoItem, wizIcone === ico && s.icoItemActive]}>
                          <Ionicons name={ico as any} size={22} color={C.dark} />
                                {wizIcone === ico && (
                                  <View style={s.icoCheck}><Ionicons name="checkmark" size={10} color={C.white} /></View>
                                )}
                              </Pressable>
                            ))}
                          </ScrollView>
                          <Text style={s.wizIcoHint}>Choisissez l'icône qui représente le mieux votre objectif</Text>
                          <Text style={s.modalSub}>Nom de l'objectif</Text>
                          <TextInput style={s.input} value={wizTitre} onChangeText={setWizTitre} placeholder="Ex: Acheter une voiture" placeholderTextColor={C.hint} />
                          <Text style={s.modalSub}>Description (facultative)</Text>
                          <TextInput style={[s.input, {minHeight:50}]} value={wizDescription} onChangeText={setWizDescription} placeholder="Décrivez votre objectif..." placeholderTextColor={C.hint} multiline />
                        </View>
                      )}

                      {/* ── Étape 2 : Montant cible ── */}
                      {wizardStep === 2 && (
                        <View>
                          <Text style={s.wizStepTitle}>💰 Montant cible</Text>
                          <View style={s.wizStep2Card}>
                            <View style={s.wizStep2Row}>
                              <Ionicons name="flag-outline" size={18} color={ACCENT} />
                              <Text style={s.wizStep2Label}>Montant cible</Text>
                            </View>
                            <TextInput
                              style={s.wizStep2AmountInput}
                              value={wizMontant}
                              onChangeText={setWizMontant}
                              placeholder="0"
                              placeholderTextColor={C.hint}
                              keyboardType="numeric"
                            />
                            {wizMontant.trim() ? (
                              <Text style={s.wizStep2Fmt}>{fmt(parseInt(wizMontant))}</Text>
                            ) : null}

                            <View style={s.wizStep2Divider} />

                            <View style={s.wizStep2Row}>
                              <Ionicons name="calendar-outline" size={18} color={ACCENT} />
                              <Text style={s.wizStep2Label}>Date souhaitée</Text>
                            </View>
                            <TextInput
                              style={s.input}
                              value={wizDateLimite}
                              onChangeText={setWizDateLimite}
                              placeholder="Ex: 2027-12"
                              placeholderTextColor={C.hint}
                            />

                            {(() => {
                              const mt = parseInt(wizMontant);
                              if (!mt || mt <= 0 || !wizDateLimite.trim()) return null;
                              const parts = wizDateLimite.split('-');
                              if (parts.length < 2) return null;
                              const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                              const now = new Date();
                              const monthsDiff = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
                              if (monthsDiff <= 0) return null;
                              const monthly = Math.ceil(mt / monthsDiff);
                              return (
                                <View style={s.wizStep2Estimate}>
                                  <Ionicons name="bulb-outline" size={16} color={ACCENT} />
                                  <Text style={s.wizStep2EstimateText}>
                                    Vous devrez épargner environ{' '}
                                    <Text style={{fontWeight:'800'}}>{fmt(monthly)}</Text> par mois
                                  </Text>
                                </View>
                              );
                            })()}
                          </View>
                        </View>
                      )}

                      {/* ── Étape 3 : Financement ── */}
                      {wizardStep === 3 && (
                        <View>
                          <Text style={s.wizStepTitle}>🏦 Financement</Text>
                          {comptes.length === 0 ? (
                            <Text style={s.wizEmpty}>Aucun compte disponible</Text>
                          ) : (
                            comptes.map(c => {
                              const selected = wizSelectedComptes.includes(c.id);
                              return (
                                <Pressable key={c.id} style={[s.wizCompteCard, selected && s.wizCompteCardActive]} onPress={() => setWizSelectedComptes(prev => selected ? prev.filter(id => id !== c.id) : [...prev, c.id])}>
                                  <Text style={s.wizCompteIco}>{c.type_compte === 'banque' ? '🏦' : c.type_compte === 'momo' ? '📱' : '💵'}</Text>
                                  <View style={s.wizCompteInfo}>
                                    <Text style={s.wizCompteNom}>{c.nom_compte}</Text>
                                    <Text style={s.wizCompteSolde}>{fmt(c.solde_actuel)} disponibles</Text>
                                  </View>
                                  <View style={[s.wizCheckbox, selected && s.wizCheckboxOn]}>
                                    {selected && <Text style={s.wizCheckMark}>✓</Text>}
                                  </View>
                                </Pressable>
                              );
                            })
                          )}
                          <Text style={s.wizHint}>Pour le moment, aucune somme n'est prélevée.</Text>
                        </View>
                      )}

                      {/* ── Étape 4 : Récapitulatif ── */}
                      {wizardStep === 4 && (
                        <View>
                          <Text style={s.wizStepTitle}>✅ Récapitulatif</Text>
                          <View style={s.wizSummaryCard}>
                            <View style={s.wizSummaryRow}>
                              <Text style={s.wizSummaryLabel}>Nom</Text>
                              <Text style={s.wizSummaryValue}>{wizTitre}</Text>
                            </View>
                            <View style={[s.wizSummaryRow, {borderBottomWidth:0}]}>
                              <Text style={s.wizSummaryLabel}>Icône</Text>
                              <Text style={{fontSize:23}}>{wizIcone}</Text>
                            </View>
                            <View style={s.wizSummaryRow}>
                              <Text style={s.wizSummaryLabel}>Montant cible</Text>
                              <Text style={s.wizSummaryValue}>{fmt(parseInt(wizMontant) || 0)}</Text>
                            </View>
                            {wizDateLimite ? (
                              <View style={[s.wizSummaryRow, {borderBottomWidth:0}]}>
                                <Text style={s.wizSummaryLabel}>Date cible</Text>
                                <Text style={s.wizSummaryValue}>{wizDateLimite}</Text>
                              </View>
                            ) : (
                              <View style={[s.wizSummaryRow, {borderBottomWidth:0}]}>
                                <Text style={s.wizSummaryLabel}>Date cible</Text>
                                <Text style={[s.wizSummaryValue, {color:C.hint}]}>Non définie</Text>
                              </View>
                            )}
                            <View style={[s.wizSummaryRow, {borderBottomWidth:0}]}>
                              <Text style={s.wizSummaryLabel}>Comptes sélectionnés</Text>
                              <Text style={[s.wizSummaryValue, {maxWidth:'50%'}]} numberOfLines={2}>
                                {wizSelectedComptes.length > 0 ? wizSelectedComptes.map(id => comptes.find(c => c.id === id)?.nom_compte || `#${id}`).join(', ') : 'Aucun'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </ScrollView>

                    {/* Navigation */}
                    <View style={s.wizNav}>
                      {wizardStep > 1 && (
                        <TouchableOpacity style={s.wizBackBtn} onPress={handleWizardBack} activeOpacity={0.7}>
                          <Ionicons name="chevron-back" size={14} color={C.muted} />
                          <Text style={s.wizBackBtnTxt}>Retour</Text>
                        </TouchableOpacity>
                      )}
                      {wizardStep < 4 ? (
                        <TouchableOpacity style={s.wizNextBtn} onPress={handleWizardNext} activeOpacity={0.7}>
                          <Text style={s.wizNextBtnTxt}>Suivant</Text>
                          <Ionicons name="chevron-forward" size={14} color={C.white} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={s.wizCreateBtn} onPress={handleWizardCreate} disabled={wizSaving} activeOpacity={0.7}>
                          {wizSaving ? <ActivityIndicator color={C.white} size="small" /> : (
                            <><Text style={s.wizCreateBtnTxt}>Créer l'objectif</Text><Ionicons name="checkmark-circle" size={16} color={C.white} /></>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </Animated.View>
              </Pressable>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Alimenter Wizard ──────────── */}
      <Modal visible={showAlimWizard} transparent animationType="none" onRequestClose={closeAlimWizard}>
        <View style={{flex:1, position:'relative'}}>
          <View style={s.wizardOverlay}>
             <Pressable style={{flex:1, justifyContent:'flex-end'}} onPress={closeAlimWizard}>
               <Pressable onPress={()=>{}}>
               <Animated.View style={[s.wizardSheet, alimWizSheetCombined]} {...alimPanResponder.panHandlers}>
                 <View style={s.wizDragHandle} />
                {alimSuccess ? (
                  <View style={s.successWrap}>
                    <Animated.View style={[s.successCircle, alimWizCheckStyle]}>
                      <Text style={s.successIcon}>✓</Text>
                    </Animated.View>
                    <Text style={s.successTitle}>Objectif alimenté !</Text>
                    <Text style={s.alimWizSuccessSub}>{fmt(parseInt(alimMontant))} ajoutés à {alimTarget?.titre}</Text>
                    {alimAtteint && (
                      <>
                        <View style={s.alimAtteintBadge}>
                          <Text style={s.alimAtteintBadgeTxt}>✅ Objectif atteint</Text>
                        </View>
                        <View style={s.alimAtteintActions}>
                          <TouchableOpacity style={s.alimAtteintBtn} onPress={handleArchiver} disabled={archiverSaving} activeOpacity={0.7}>
                            {archiverSaving ? <ActivityIndicator color={C.white} size="small" /> : <Text style={s.alimAtteintBtnTxt}>Archiver l'objectif</Text>}
                          </TouchableOpacity>
                          <TouchableOpacity style={s.alimAtteintBtnSecondary} onPress={handleAlimContinuer} activeOpacity={0.7}>
                            <Text style={s.alimAtteintBtnSecondaryTxt}>Continuer à l'alimenter</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                ) : (
                  <>
                    <View style={s.wizTopBar}>
                      <View style={s.alimWizHeader}>
                        <Text style={{fontSize:29}}>{alimTarget?.icone || '🎯'}</Text>
                        <View style={s.alimWizHeaderInfo}>
                          <Text style={s.alimWizHeaderTitre} numberOfLines={1}>{alimTarget?.titre || 'Objectif'}</Text>
                          <Text style={s.alimWizHeaderMontant}>{fmt(alimTarget?.montant_actuel)} / {fmt(alimTarget?.montant_cible)}</Text>
                        </View>
                        <View style={s.alimWizHeaderPctWrap}>
                          <Text style={s.alimWizHeaderPct}>{pct(alimTarget || {montant_cible:1, montant_actuel:0})}%</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={closeAlimWizard} style={s.wizCloseBtn} hitSlop={8} activeOpacity={0.7}>
                        <Ionicons name="close" size={18} color={C.muted} />
                      </TouchableOpacity>
                    </View>

                    <View style={s.alimWizProgressOuter}>
                      <Animated.View style={[s.alimWizProgressInner, alimWizProgressStyle]} />
                    </View>

                    <ScrollView style={s.wizContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                      {alimStep === 1 && (
                        <View>
                          <Text style={s.wizStepTitle}>💳 Choisir le compte</Text>
                          {comptes.filter(c => parseFloat(c.solde_actuel) > 0).length === 0 ? (
                            <Text style={s.wizEmpty}>Aucun compte avec solde disponible</Text>
                          ) : (
                            comptes.filter(c => parseFloat(c.solde_actuel) > 0).map(c => {
                              const selected = alimCompteId === c.id;
                              return (
                                <Pressable key={c.id} style={[s.alimWizCompteCard, selected && s.alimWizCompteCardActive]} onPress={() => setAlimCompteId(c.id)}>
                                  <Text style={s.wizCompteIco}>{c.type_compte === 'banque' ? '🏦' : c.type_compte === 'momo' ? '📱' : '💵'}</Text>
                                  <View style={s.wizCompteInfo}>
                                    <Text style={s.wizCompteNom}>{c.nom_compte}</Text>
                                    <Text style={s.wizCompteSolde}>{fmt(c.solde_actuel)} disponibles</Text>
                                  </View>
                                  <View style={[s.alimWizRadio, selected && s.alimWizRadioOn]}>
                                    {selected && <View style={s.alimWizRadioDot} />}
                                  </View>
                                </Pressable>
                              );
                            })
                          )}
                        </View>
                      )}

                      {alimStep === 2 && (
                        <View>
                          <Text style={s.wizStepTitle}>💵 Montant</Text>
                          <Text style={s.modalSub}>Montant à verser (FCFA)</Text>
                          <TextInput style={s.input} value={alimMontant} onChangeText={setAlimMontant} placeholder="Ex: 200000" placeholderTextColor={C.hint} keyboardType="numeric" />
                          {alimCompteId && (() => {
                            const c = comptes.find(x => x.id === alimCompteId);
                            if (!c) return null;
                            const solde = parseFloat(c.solde_actuel);
                            const mt = parseInt(alimMontant) || 0;
                            const restant = solde - mt;
                            return (
                              <View style={s.alimWizSoldeRestant}>
                                <View style={s.alimWizSoldeRow}>
                                  <Text style={s.wizCompteIco}>{c.type_compte === 'banque' ? '🏦' : c.type_compte === 'momo' ? '📱' : '💵'}</Text>
                                  <Text style={s.alimWizSoldeLabel}>{c.nom_compte}</Text>
                                  <Text style={s.alimWizSoldeVal}>{fmt(solde)}</Text>
                                </View>
                                <Ionicons name="arrow-down" size={14} color={C.muted} />
                                <View style={s.alimWizSoldeRow}>
                                  <Text style={s.alimWizSoldeLabel}>Après versement</Text>
                                  <Text style={[s.alimWizSoldeVal, restant >= 0 ? {color:C.dark} : {color:C.danger}]}>{fmt(Math.max(0, restant))}</Text>
                                </View>
                              </View>
                            );
                          })()}
                        </View>
                      )}

                      {alimStep === 3 && (
                        <View>
                          <Text style={s.wizStepTitle}>📋 Récapitulatif</Text>

                          <View style={s.alimRecapHeader}>
                            <Text style={{fontSize:36}}>{alimTarget?.icone || '🎯'}</Text>
                            <View style={{flex:1}}>
                              <Text style={s.alimRecapHeaderTitre}>{alimTarget?.titre}</Text>
                              <Text style={s.alimRecapHeaderProgress}>{fmt(alimTarget?.montant_actuel)} / {fmt(alimTarget?.montant_cible)}</Text>
                            </View>
                          </View>

                          <View style={s.alimRecapCard}>
                            <View style={s.alimRecapRow}>
                              <Ionicons name="wallet-outline" size={16} color={C.muted} />
                              <Text style={s.alimRecapLabel}>Compte source</Text>
                              <Text style={s.alimRecapValue}>
                                {(() => { const c = comptes.find(x => x.id === alimCompteId); return c ? c.nom_compte : ''; })()}
                              </Text>
                            </View>

                            <View style={s.alimRecapDivider} />

                            <View style={s.alimRecapRow}>
                              <Ionicons name="cash-outline" size={16} color={C.muted} />
                              <Text style={s.alimRecapLabel}>Montant du versement</Text>
                              <Text style={s.alimRecapMontant}>{fmt(parseInt(alimMontant) || 0)}</Text>
                            </View>

                            <View style={s.alimRecapDivider} />

                            <View style={s.alimRecapRow}>
                              <Ionicons name="trending-up-outline" size={16} color={C.muted} />
                              <Text style={s.alimRecapLabel}>Nouveau total épargné</Text>
                              <Text style={s.alimRecapValue}>{fmt((parseFloat(alimTarget?.montant_actuel||0) + parseInt(alimMontant||0)))}</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </ScrollView>

                    <View style={s.wizNav}>
                      {alimStep > 1 ? (
                        <TouchableOpacity style={s.wizBackBtn} onPress={handleAlimBack} activeOpacity={0.7}>
                          <Ionicons name="chevron-back" size={14} color={C.muted} />
                          <Text style={s.wizBackBtnTxt}>Retour</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{flex:1}} />
                      )}
                      {alimStep < 3 ? (
                        <TouchableOpacity style={s.wizNextBtn} onPress={handleAlimNext} activeOpacity={0.7}>
                          <Text style={s.wizNextBtnTxt}>Suivant</Text>
                          <Ionicons name="chevron-forward" size={14} color={C.white} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={s.wizCreateBtn} onPress={handleAlimConfirm} disabled={alimSaving} activeOpacity={0.7}>
                          {alimSaving ? <ActivityIndicator color={C.white} size="small" /> : (
                            <><Text style={s.wizCreateBtnTxt}>Confirmer le versement</Text><Ionicons name="checkmark-circle" size={16} color={C.white} /></>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </Animated.View>
              </Pressable>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Modal Supprimer ── */}
      <Modal visible={showDelete} transparent animationType="none" onRequestClose={()=>setShowDelete(false)}>
        <View style={{flex:1, position:'relative'}}>
          <BlurView intensity={15} tint="dark" style={s.blur}>
            <View style={s.overlay}>
              <View style={s.modalCard}>
                <View style={s.modalHeader}>
                  <View style={s.modalHeaderText}>
                    <Text style={s.modalTitle}>🗑️ Supprimer</Text>
                  </View>
                  <Pressable onPress={()=>setShowDelete(false)} style={s.closeBtn} hitSlop={8}>
                    <Text style={s.closeBtnTxt}>✕</Text>
                  </Pressable>
                </View>

                {deleteTarget && (
                  <Text style={s.deleteMsg}>
                    Êtes-vous sûr de vouloir supprimer l'objectif "{deleteTarget.titre}" ?{'\n\n'}
                    Montant actuel : {fmt(deleteTarget.montant_actuel)}{'\n'}
                    Cette action est irréversible.
                  </Text>
                )}

                <View style={s.modalActions}>
                  <Pressable
                    style={({pressed})=>[s.cancelBtn, s.btnHalf, pressed&&s.cancelBtnPressed]}
                    onPress={()=>setShowDelete(false)}
                  >
                    <Text style={s.cancelBtnTxt}>Annuler</Text>
                  </Pressable>
                  <Pressable
                    style={({pressed})=>[s.deleteBtn, s.btnHalf, pressed&&s.deleteBtnPressed]}
                    onPress={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? <ActivityIndicator color={C.white} size="small" /> : <Text style={s.deleteBtnTxt}>Supprimer</Text>}
                  </Pressable>
                </View>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* ── Modal Historique ── */}
      <Modal visible={showHisto} transparent animationType="none" onRequestClose={()=>setShowHisto(false)}>
        <View style={{flex:1, position:'relative'}}>
          <BlurView intensity={15} tint="dark" style={s.blur}>
            <ScrollView contentContainerStyle={s.overlay} keyboardShouldPersistTaps="handled">
              <View style={s.modalCard}>
                <View style={s.modalHeader}>
                  <View style={s.modalHeaderText}>
                    <Text style={s.modalTitle}>📋 Historique</Text>
                    {histoTarget && <Text style={s.alimSub}>{histoTarget.icone || '🎯'} {histoTarget.titre}</Text>}
                  </View>
                  <Pressable onPress={()=>setShowHisto(false)} style={s.closeBtn} hitSlop={8}>
                    <Text style={s.closeBtnTxt}>✕</Text>
                  </Pressable>
                </View>

                {histoLoading ? (
                  <ActivityIndicator size="small" color={ACCENT} style={{marginVertical:Spacing.xl}} />
                ) : histoData.length === 0 ? (
                  <Text style={s.histoEmpty}>Aucune alimentation enregistrée</Text>
                ) : (
                  histoData.map((h, i) => (
                    <View key={h.id||i} style={[s.histoItem, i === histoData.length - 1 && {borderBottomWidth:0}]}>
                      <View style={{flex:1}}>
                        <Text style={s.histoMt}>{fmt(h.montant)}</Text>
                        <Text style={s.histoDate}>{formatDateFull(h.date_alimentation)}</Text>
                      </View>
                      <Text style={s.histoCompte}>{h.nom_compte || 'Compte supprimé'}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </BlurView>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}





