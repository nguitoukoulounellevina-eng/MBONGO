import React, { useEffect, useState, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import api from '@/app/services/api';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { Spacing, Radius } from '@/constants/spacing';
import { PageHeader } from '@/app/components/PageHeader';
import { useTheme } from '@/app/contexts/ThemeContext';

const EMOJIS = ['🛒','🚕','🏠','💡','❤️','🎓','🎮','🛍','📱','✈️','💰','💼','🎁','📈','💵','🍕','👕','🐾','🎵','⚡'];
const COLORS = ['#D97706','#3B82F6','#DC2626','#F59E0B','#EF4444','#7C3AED','#EC4899','#14B8A6','#6B7280','#16A34A','#22D3A5','#A855F7','#06B6D4','#84CC16','#F97316','#E11D48','#0EA5E9','#8B5CF6','#10B981','#F43F5E'];


export default function Categorie() {
const { colors: C } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    root:{ flex:1, backgroundColor:C.bg },
    scroll:{ flexGrow:1, paddingVertical:0 },
    body:{ padding:Spacing.lg },

    tabRow:{ flexDirection:'row', backgroundColor:C.surface, borderRadius:Radius.md, padding:Spacing.xs, marginBottom:Spacing.lg },
    tabBtn:{ flex:1, paddingVertical:Spacing.sm, alignItems:'center', borderRadius:Radius.md },
    tabActive:{ backgroundColor:C.dark },
    tabTxt:{ fontSize:13, fontWeight:'700', color:C.muted },
    tabTxtActive:{ color:C.white },

    item:{ flexDirection:'row', alignItems:'center', gap:Spacing.md, backgroundColor:C.white, borderRadius:Radius.xl, padding:Spacing.md, marginBottom:Spacing.md, borderWidth:1, borderColor:C.border },
    itemBadge:{ width:36, height:36, borderRadius:Radius.md, alignItems:'center', justifyContent:'center' },
    itemEmoji:{ fontSize:18 },
    itemInfo:{ flex:1 },
    itemNom:{ fontSize:15, fontWeight:'600', color:C.dark },
    itemType:{ fontSize:12, color:C.muted, marginTop:2 },
    itemArrow:{ fontSize:19, color:C.hint, fontWeight:'600' },

    addBtn:{ width:48, height:48, borderRadius:Radius.xl, alignItems:'center', justifyContent:'center', backgroundColor:C.purple, alignSelf:'center', marginTop:Spacing.lg, shadowColor:C.purple, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
    addBtnPressed:{ backgroundColor:C.purpleDark },
    addBtnTxt:{ fontSize:25, fontWeight:'700', color:C.white, lineHeight:26 },

    empty:{ alignItems:'center', paddingVertical:Spacing.xl },
    emptyIco:{ fontSize:37, marginBottom:Spacing.md },
    emptyTxt:{ fontSize:15, fontWeight:'600', color:C.muted, marginBottom:Spacing.xs },
    emptySub:{ fontSize:12, color:C.muted, textAlign:'center', opacity:0.7 },

    blur:{ flex:1 },
    overlay:{ flexGrow:1, justifyContent:'center', alignItems:'center', padding:Spacing.xl },
    modalCard:{ backgroundColor:C.white, borderRadius:Radius.xl, padding:Spacing.xl, width:'100%', maxWidth:360 },
    modalTitle:{ fontSize:21, fontWeight:'800', color:C.dark, marginBottom:Spacing.md },

    typeRow:{ flexDirection:'row', gap:Spacing.md, marginBottom:Spacing.xs },
    typeOption:{ flex:1, flexDirection:'row', alignItems:'center', gap:Spacing.sm, paddingVertical:Spacing.md, paddingHorizontal:Spacing.lg, borderRadius:Radius.md, backgroundColor:C.surface, borderWidth:1.5, borderColor:C.border },
    typeOptionActive:{ borderColor:C.purple, backgroundColor:'#F5F3FF' },
    radio:{ width:20, height:20, borderRadius:Radius.full, borderWidth:2, borderColor:C.border, alignItems:'center', justifyContent:'center' },
    radioActive:{ borderColor:C.purple },
    radioDot:{ width:10, height:10, borderRadius:Radius.full, backgroundColor:C.purple },
    typeOptionTxt:{ fontSize:14, fontWeight:'700', color:C.dark },

    modalSub:{ fontSize:12, fontWeight:'700', color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6, marginTop:Spacing.md },
    input:{ backgroundColor:C.surface, borderRadius:Radius.md, padding:Spacing.lg, fontSize:16, fontWeight:'600', color:C.dark, borderWidth:1.5, borderColor:C.border },
    emojiRow:{ flexDirection:'row', marginBottom:Spacing.xs },
    emojiItem:{ width:38, height:38, borderRadius:Radius.md, backgroundColor:C.surface, alignItems:'center', justifyContent:'center', marginRight:6, marginBottom:6, borderWidth:1.5, borderColor:C.border },
    emojiActive:{ borderColor:C.purple, backgroundColor:'#F5F3FF' },
    emojiTxt:{ fontSize:19 },
    colorRow:{ flexDirection:'row', flexWrap:'wrap', marginBottom:Spacing.xs },
    colorItem:{ width:30, height:30, borderRadius:Spacing.sm, marginRight:6, marginBottom:6, borderWidth:2, borderColor:'transparent' },
    colorActive:{ borderColor:C.dark },
    modalActions:{ flexDirection:'row', gap:Spacing.md, marginTop:Spacing.xl },
    btnCancel:{ flex:1, borderRadius:Radius.md, height:48, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:C.border, backgroundColor:C.white },
    btnCancelPressed:{ borderColor:C.purple, backgroundColor:'#F5F3FF' },
    btnCancelTxt:{ fontSize:14, fontWeight:'700', color:C.muted },
    btnSave:{ flex:1, borderRadius:Radius.md, height:48, alignItems:'center', justifyContent:'center', backgroundColor:C.purple, shadowColor:C.purple, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
    btnSavePressed:{ backgroundColor:C.purpleDark },
    btnSaveTxt:{ fontSize:14, fontWeight:'700', color:C.white },
    sqRow:{ flexDirection:'row', gap:Spacing.xs, alignItems:'center' },
    sq:{ width:6, height:6, borderRadius:1.5, backgroundColor:C.purple },
    sqLight:{ backgroundColor:'rgba(255,255,255,0.7)' },
    successWrap:{ alignItems:'center', paddingVertical:Spacing.xl },
    successCircle:{ width:64, height:64, borderRadius:32, backgroundColor:C.success, alignItems:'center', justifyContent:'center', marginBottom:Spacing.lg },
    successIcon:{ fontSize:29, color:C.white, fontWeight:'800' },
    successTitle:{ fontSize:21, fontWeight:'800', color:C.dark, marginBottom:Spacing.xs },

    overlayEdit:{ flex:1, justifyContent:'flex-end' },
    editSheet:{ backgroundColor:C.white, borderTopLeftRadius:28, borderTopRightRadius:28, paddingHorizontal:Spacing.xl, paddingTop:Spacing.sm, paddingBottom:24 },
    editScroll:{ maxHeight:500 },
    sheetHandle:{ width:36, height:4, borderRadius:2, backgroundColor:C.border, alignSelf:'center', marginBottom:Spacing.sm },

    editHeader:{ alignItems:'center', paddingVertical:Spacing.sm },
    editHeaderCircle:{ width:52, height:52, borderRadius:26, alignItems:'center', justifyContent:'center', marginBottom:Spacing.sm, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.15, shadowRadius:8, elevation:6 },
    editHeaderEmoji:{ fontSize:24 },
    editHeaderNom:{ fontSize:17, fontWeight:'800', color:C.dark, textAlign:'center', marginBottom:Spacing.xs },
    editHeaderTypeBadge:{ backgroundColor:C.surface, borderRadius:Radius.md, paddingHorizontal:Spacing.sm, paddingVertical:3 },
    editHeaderTypeTxt:{ fontSize:11, fontWeight:'700', color:C.muted },

    sectionLabel:{ fontSize:11, fontWeight:'700', color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4, marginTop:Spacing.sm },
    sectionCard:{ backgroundColor:C.surface, borderRadius:Radius.md, padding:Spacing.sm, marginTop:Spacing.xs },

    emojiGrid:{ flexDirection:'row', flexWrap:'wrap', gap:5 },
    emojiGridItem:{ width:34, height:34, borderRadius:Radius.sm, backgroundColor:C.white, alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:C.border },
    emojiGridActive:{ borderColor:C.purple, backgroundColor:'#F5F3FF', shadowColor:C.purple, shadowOffset:{width:0,height:2}, shadowOpacity:0.2, shadowRadius:4, elevation:3 },
    emojiGridTxt:{ fontSize:17 },

    colorGrid:{ flexDirection:'row', flexWrap:'wrap', gap:6 },
    colorGridItem:{ width:28, height:28, borderRadius:Radius.full, borderWidth:2.5, borderColor:'transparent' },
    colorGridActive:{ borderColor:C.white, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.2, shadowRadius:4, elevation:3 },

    btnDelete:{ flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:Spacing.md, marginTop:Spacing.md, borderRadius:Radius.md, borderWidth:1.5, borderColor:'#FEE2E2', backgroundColor:'#FFF5F5' },
    btnDeleteTxt:{ fontSize:14, fontWeight:'700', color:C.danger, letterSpacing:0.3 },

    editClose:{ position:'absolute', top:Spacing.md, right:Spacing.md, width:28, height:28, borderRadius:14, backgroundColor:C.surface, alignItems:'center', justifyContent:'center', zIndex:10 },
    editCloseTxt:{ fontSize:14, fontWeight:'700', color:C.muted, lineHeight:15 },

  }), [C]);
  const insets = useSafeAreaInsets();
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [nom, setNom] = useState('');
  const [emoji, setEmoji] = useState('🛒');
  const [color, setColor] = useState('#D97706');
  const [categorieType, setCategorieType] = useState<'depense' | 'revenu'>('depense');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tab, setTab] = useState<'depense' | 'revenu'>('depense');

  const cardEntry = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const cancelDotSlide = useSharedValue(0);
  const saveDotSlide = useSharedValue(0);
  const [dotButton, setDotButton] = useState<'cancel' | 'save' | null>(null);

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

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.categories.list();
      let list = Array.isArray(res) ? res : (res.data || res.categories || []);
      const autres = list.filter((c: any) => (c.libelle || c.nom) === 'Autre revenu');
      for (const a of autres) {
        try { await api.categories.remove(a.id); } catch {}
      }
      list = list.filter((c: any) => (c.libelle || c.nom) !== 'Autre revenu');
      const existingNames = new Set(list.map((c:any)=>(c.libelle||c.nom)));
      let changed = false;
      for (const cat of DEFAULT_CATEGORIES) {
        if (!existingNames.has(cat.nom)) {
          try { await api.categories.create(cat); changed = true; } catch {}
        }
      }
      if (changed) {
        const res2 = await api.categories.list();
        list = Array.isArray(res2) ? res2 : (res2.data || res2.categories || []);
      }
      setCats(list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (showAdd || showEdit) {
      cardEntry.value = withSpring(1, { damping: 14, stiffness: 100 });
      checkScale.value = 0;
      setSuccess(false);
    } else {
      cardEntry.value = 0;
      cancelDotSlide.value = 0;
      saveDotSlide.value = 0;
      setDotButton(null);
    }
  }, [showAdd, showEdit]);

  const openAdd = () => {
    setEditing(null);
    setNom('');
    setEmoji('🛒');
    setColor('#D97706');
    setCategorieType(tab);
    setShowAdd(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setNom(c.libelle || c.nom || '');
    setEmoji(c.icone || c.emoji || '📁');
    setColor(c.couleur || '#7C3AED');
    setCategorieType(c.type || 'depense');
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!nom.trim()) { Alert.alert('Erreur', 'Le nom est requis'); return; }
    setSaving(true);
    try {
      const data = { nom: nom.trim(), emoji, couleur: color, type: categorieType };
      if (editing) await api.categories.update(editing.id, data);
      else await api.categories.create(data);
      setSaving(false);
      await new Promise(r => setTimeout(r, 400));
      setSuccess(true);
      checkScale.value = withSpring(1, { damping: 8, stiffness: 150 });
      setTimeout(() => {
        setShowAdd(false);
        setShowEdit(false);
        setEditing(null);
        setSuccess(false);
        load();
      }, 600);
    } catch (e: any) {
      setSaving(false);
      cancelDotSlide.value = withTiming(0);
      saveDotSlide.value = withTiming(0);
      setDotButton(null);
      Alert.alert('Erreur', e.message || 'Impossible d\'enregistrer la catégorie');
    }
  };

  const handleDelete = (c: any) => {
    Alert.alert('Supprimer', `Supprimer la catégorie « ${c.libelle || c.nom} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', style: 'destructive', onPress: async () => {
        try {
          await api.categories.remove(c.id);
          setShowEdit(false);
          setEditing(null);
          load();
        } catch (e: any) {
          Alert.alert('Erreur', e.message || 'Impossible de supprimer');
        }
      }},
    ]);
  };

  const renderItem = (c: any) => (
    <Pressable key={c.id} style={s.item} onPress={() => openEdit(c)}>
      <View style={[s.itemBadge, { backgroundColor: c.couleur || '#7C3AED' }]}>
        <Text style={s.itemEmoji}>{c.icone || c.emoji || '📁'}</Text>
      </View>
      <View style={s.itemInfo}>
        <Text style={s.itemNom}>{c.libelle || c.nom}</Text>
        <Text style={s.itemType}>{c.type === 'depense' ? 'Dépense' : 'Revenu'}</Text>
      </View>
      <Text style={s.itemArrow}>›</Text>
    </Pressable>
  );

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <PageHeader title="Catégories" icon="🏷️" color={C.dark} />
        <Animated.ScrollView contentContainerStyle={s.scroll}>
          <View style={s.body}>
          <View style={s.tabRow}>
            <TouchableOpacity style={[s.tabBtn, tab==='depense' && s.tabActive]} onPress={()=>setTab('depense')}>
              <Text style={[s.tabTxt, tab==='depense' && s.tabTxtActive]}>💸 Dépenses</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tabBtn, tab==='revenu' && s.tabActive]} onPress={()=>setTab('revenu')}>
              <Text style={[s.tabTxt, tab==='revenu' && s.tabTxtActive]}>💰 Revenus</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={C.purple} size="large" style={{marginVertical:32}} />
          ) : cats.filter(c => c.type === tab).length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIco}>📭</Text>
              <Text style={s.emptyTxt}>Aucune catégorie</Text>
              <Text style={s.emptySub}>Ajoutez une catégorie avec le bouton +</Text>
            </View>
          ) : (
            cats.filter(c => c.type === tab).map(renderItem)
          )}
        </View>
      </Animated.ScrollView>

      <Pressable
        style={({pressed})=>[{
          position:'absolute', bottom: insets.bottom + 64, left:'50%', marginLeft: -24,
          width:48, height:48, borderRadius:24, alignItems:'center', justifyContent:'center',
          backgroundColor: C.purple,
          shadowColor: C.purple, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:8, elevation:6,
        }, pressed && { backgroundColor: C.purpleDark }]}
        onPress={openAdd}
      >
        <Text style={{fontSize:25, fontWeight:'700', color:C.white, lineHeight:26}}>+</Text>
      </Pressable>
      </View>

      {/* Modal Ajout */}
      <Modal visible={showAdd} transparent animationType="none" onRequestClose={()=>setShowAdd(false)}>
        <BlurView intensity={15} tint="dark" style={s.blur}>
          <ScrollView contentContainerStyle={s.overlay} keyboardShouldPersistTaps="handled">
            <Animated.View style={[s.modalCard, cardStyle]}>
              {success ? (
                <View style={s.successWrap}>
                  <Animated.View style={[s.successCircle, checkStyle]}>
                    <Text style={s.successIcon}>✓</Text>
                  </Animated.View>
                  <Text style={s.successTitle}>Catégorie créée !</Text>
                </View>
              ) : (
                <>
                  <Text style={s.modalTitle}>Ajouter une catégorie</Text>

                  <Text style={s.modalSub}>Nom de la catégorie</Text>
                  <TextInput style={s.input} value={nom} onChangeText={setNom} placeholder="Ex: Alimentation" placeholderTextColor={C.hint} />

                  <Text style={s.modalSub}>Type</Text>
                  <View style={s.typeRow}>
                    <Pressable
                      style={[s.typeOption, categorieType==='depense' && s.typeOptionActive]}
                      onPress={()=>setCategorieType('depense')}
                    >
                      <View style={[s.radio, categorieType==='depense' && s.radioActive]}>
                        {categorieType==='depense' && <View style={s.radioDot} />}
                      </View>
                      <Text style={s.typeOptionTxt}>Dépense</Text>
                    </Pressable>
                    <Pressable
                      style={[s.typeOption, categorieType==='revenu' && s.typeOptionActive]}
                      onPress={()=>setCategorieType('revenu')}
                    >
                      <View style={[s.radio, categorieType==='revenu' && s.radioActive]}>
                        {categorieType==='revenu' && <View style={s.radioDot} />}
                      </View>
                      <Text style={s.typeOptionTxt}>Revenu</Text>
                    </Pressable>
                  </View>

                  <Text style={s.modalSub}>Icône</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.emojiRow}>
                    {EMOJIS.map((e,i)=>(
                      <Pressable
                        key={i}
                        style={[s.emojiItem, emoji===e && s.emojiActive]}
                        onPress={()=>setEmoji(e)}
                      >
                        <Text style={s.emojiTxt}>{e}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={s.modalSub}>Couleur</Text>
                  <View style={s.colorRow}>
                    {COLORS.map((c,i)=>(
                      <Pressable
                        key={i}
                        style={[s.colorItem, { backgroundColor: c }, color===c && s.colorActive]}
                        onPress={()=>setColor(c)}
                      />
                    ))}
                  </View>

                  <View style={s.modalActions}>
                    <Pressable
                      style={({pressed})=>[s.btnCancel, pressed&&s.btnCancelPressed]}
                      onPress={()=>setTimeout(()=>setShowAdd(false), 600)}
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
                    <Pressable
                      style={({pressed})=>[s.btnSave, pressed&&s.btnSavePressed]}
                      onPress={handleSave}
                      disabled={saving}
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
          </ScrollView>
        </BlurView>
      </Modal>

      {/* Modal Édition (Bottom Sheet) */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={()=>setShowEdit(false)}>
        <BlurView intensity={15} tint="dark" style={s.blur}>
          <Pressable style={s.overlayEdit} onPress={()=>setShowEdit(false)}>
            <Pressable onPress={()=>{}}>
              <Animated.View style={[s.editSheet, cardStyle]}>
                <Pressable style={s.editClose} onPress={()=>setShowEdit(false)} hitSlop={8}>
                  <Text style={s.editCloseTxt}>✕</Text>
                </Pressable>
                {success ? (
                  <View style={s.successWrap}>
                    <Animated.View style={[s.successCircle, checkStyle]}>
                      <Text style={s.successIcon}>✓</Text>
                    </Animated.View>
                    <Text style={s.successTitle}>Catégorie modifiée !</Text>
                  </View>
                ) : (
                  <ScrollView style={s.editScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={s.sheetHandle} />

                    <View style={s.editHeader}>
                      <View style={[s.editHeaderCircle, { backgroundColor: color }]}>
                        <Text style={s.editHeaderEmoji}>{emoji}</Text>
                      </View>
                      <Text style={s.editHeaderNom}>{nom || 'Nom'}</Text>
                      <View style={s.editHeaderTypeBadge}>
                        <Text style={s.editHeaderTypeTxt}>
                          {categorieType === 'depense' ? '📉 Dépense' : '📈 Revenu'}
                        </Text>
                      </View>
                    </View>

                    <Text style={s.sectionLabel}>Nom</Text>
                    <TextInput
                      style={s.input}
                      value={nom}
                      onChangeText={setNom}
                      placeholder="Ex: Alimentation"
                      placeholderTextColor={C.hint}
                    />

                    <View style={s.sectionCard}>
                      <Text style={s.sectionLabel}>Icône</Text>
                      <View style={s.emojiGrid}>
                        {EMOJIS.map((e,i)=>(
                          <Pressable
                            key={i}
                            style={[s.emojiGridItem, emoji===e && s.emojiGridActive]}
                            onPress={()=>setEmoji(e)}
                          >
                            <Text style={s.emojiGridTxt}>{e}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <View style={s.sectionCard}>
                      <Text style={s.sectionLabel}>Couleur</Text>
                      <View style={s.colorGrid}>
                        {COLORS.map((c,i)=>(
                          <Pressable
                            key={i}
                            style={[s.colorGridItem, { backgroundColor: c }, color===c && s.colorGridActive]}
                            onPress={()=>setColor(c)}
                          />
                        ))}
                      </View>
                    </View>

                    <Pressable
                      style={({pressed})=>[{
                        flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                        paddingVertical:Spacing.md, paddingHorizontal:Spacing.md,
                        marginTop:Spacing.sm, borderRadius:Radius.md,
                        backgroundColor: editing?.est_quotidien ? '#FEF3C7' : C.surface,
                        borderWidth:1.5, borderColor: editing?.est_quotidien ? '#F59E0B' : C.border,
                      }, pressed && { opacity:0.7 }]}
                      onPress={async () => {
                        try {
                          const res = await api.categories.toggleQuotidien(editing.id);
                          setEditing({...editing, est_quotidien: res.est_quotidien});
                          load();
                        } catch (e: any) {
                          Alert.alert('Erreur', e.message || 'Impossible de modifier');
                        }
                      }}
                    >
                      <View style={{flexDirection:'row', alignItems:'center', gap:Spacing.sm}}>
                        <Ionicons
                          name={editing?.est_quotidien ? 'sunny' : 'sunny-outline'}
                          size={18}
                          color={editing?.est_quotidien ? '#D97706' : C.muted}
                        />
                        <Text style={{
                          fontSize:14, fontWeight:'700',
                          color: editing?.est_quotidien ? '#92400E' : C.text,
                        }}>
                          Visible au quotidien
                        </Text>
                      </View>
                      <Ionicons
                        name={editing?.est_quotidien ? 'toggle' : 'toggle-outline'}
                        size={22}
                        color={editing?.est_quotidien ? '#D97706' : C.hint}
                      />
                    </Pressable>

                    <Pressable style={s.btnDelete} onPress={()=>handleDelete(editing)}>
                      <Text style={s.btnDeleteTxt}>🗑️   Supprimer la catégorie</Text>
                    </Pressable>

                    <View style={s.modalActions}>
                      <Pressable
                        style={({pressed})=>[s.btnCancel, pressed&&s.btnCancelPressed]}
                        onPress={()=>setTimeout(()=>setShowEdit(false), 600)}
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
                      <Pressable
                        style={({pressed})=>[s.btnSave, pressed&&s.btnSavePressed]}
                        onPress={handleSave}
                        disabled={saving}
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
                    </ScrollView>
                  )}  
                </Animated.View>
            </Pressable>
          </Pressable>
        </BlurView>
      </Modal>
    </View>
  );
}






