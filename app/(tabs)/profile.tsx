import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import api, { clearAuth, setUser, getUser, API_BASE } from '@/app/services/api';
import { Spacing, Radius } from '@/constants/spacing';
import { PageHeader } from '@/app/components/PageHeader';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useTheme } from '@/app/contexts/ThemeContext';
export default function Profile() {
  const { colors: C } = useTheme();
  const toastOpacity = useSharedValue(0);
  const toastAnimStyle = useAnimatedStyle(() => ({ opacity: toastOpacity.value }));

  const s = useMemo(() => StyleSheet.create({
    root:{ flex:1, backgroundColor:C.bg },
    scroll:{ flexGrow:1, paddingVertical:0 },
    body:{ padding:Spacing.lg },
    avatarSection:{ alignItems:'center', marginBottom:Spacing.xl },
    avatarWrap:{ position:'relative', marginBottom:Spacing.md },
    avatar:{ width:72, height:72, borderRadius:36, backgroundColor:C.purple, alignItems:'center', justifyContent:'center', borderWidth:3, borderColor:C.border },
    avatarImage:{ width:72, height:72, borderRadius:36, borderWidth:3, borderColor:C.border },
    avatarTxt:{ fontSize:25, fontWeight:'800', color:C.white },
    cameraBadge:{ position:'absolute', bottom:0, right:-2, width:26, height:26, borderRadius:13, backgroundColor:C.purple, alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:C.white },
    cameraIco:{ fontSize:12 },
    name:{ fontSize:19, fontWeight:'800', color:C.dark },
    email:{ fontSize:13, color:C.muted, marginTop:3 },
    field:{ backgroundColor:C.white, borderRadius:Radius.md, padding:14, marginBottom:Spacing.md, borderWidth:1, borderColor:C.border },
    fieldLbl:{ fontSize:10, fontWeight:'700', color:C.muted, textTransform:'uppercase', letterSpacing:0.6, marginBottom:Spacing.xs },
    fieldVal:{ fontSize:15, fontWeight:'600', color:C.dark },
    btn:{ backgroundColor:C.dark, borderRadius:Radius.md, height:48, alignItems:'center', justifyContent:'center', marginBottom:Spacing.md },
    btnPressed:{ backgroundColor:'#1A1A40' },
    btnTxt:{ color:C.white, fontSize:14, fontWeight:'700' },
    btnDanger:{ borderWidth:1.5, borderColor:C.danger, borderRadius:Radius.md, height:44, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(244,63,94,0.1)' },
    btnDangerPressed:{ borderColor:C.danger, backgroundColor:'rgba(244,63,94,0.2)' },
    btnDangerTxt:{ fontSize:13, fontWeight:'700', color:C.danger },
    blur:{ flex:1 },
    overlay:{ flexGrow:1, justifyContent:'center', alignItems:'center', padding:Spacing.xl },
    modalCard:{ backgroundColor:C.white, borderRadius:20, padding:Spacing.lg, paddingBottom:20, width:'100%', maxWidth:340, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.2, shadowRadius:Spacing.xl, elevation:16 },
    modalHeader:{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', marginBottom:Spacing.sm },
    modalHeaderText:{ flex:1, marginRight:Spacing.md },
    closeBtn:{ width:26, height:26, borderRadius:Radius.md, backgroundColor:C.surface, alignItems:'center', justifyContent:'center' },
    closeBtnTxt:{ fontSize:14, fontWeight:'700', color:C.muted, lineHeight:15 },
    modalTitle:{ fontSize:17, fontWeight:'800', color:C.dark, marginBottom:1 },
    modalSubtitle:{ fontSize:12, color:C.muted },
    inputGroup:{ marginBottom:Spacing.sm },
    inputLabel:{ fontSize:11, fontWeight:'700', color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 },
    input:{ backgroundColor:C.surface, borderRadius:Radius.sm, padding:Spacing.sm, fontSize:14, fontWeight:'600', color:C.dark, borderWidth:1.5, borderColor:C.border },
    inputFocused:{ borderColor:C.purple, borderWidth:2 },
    modalActions:{ flexDirection:'row', gap:Spacing.sm, marginTop:2 },
    btnHalf:{ flex:1 },
    btnCancel:{ borderRadius:Radius.md, height:38, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, borderWidth:1.5, borderColor:C.border, backgroundColor:C.white },
    btnCancelPressed:{ borderColor:C.purple, backgroundColor:'#F5F3FF' },
    btnCancelTxt:{ fontSize:12, fontWeight:'700', color:C.muted },
    btnSave:{ flex:1, borderRadius:Radius.md, height:38, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, backgroundColor:C.purple, shadowColor:C.purple, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:Spacing.sm, elevation:6 },
    btnSavePressed:{ backgroundColor:C.purpleDark },
    btnSaveDisabled:{ opacity:0.6 },
    btnSaveTxt:{ fontSize:12, fontWeight:'700', color:C.white },
    toast:{ flexDirection:'row', alignItems:'center', gap:Spacing.sm, borderRadius:Radius.md, padding:Spacing.md, marginBottom:Spacing.md, borderWidth:1 },
    toastSuccess:{ backgroundColor:'#E8FDF5', borderColor:C.success },
    toastError:{ backgroundColor:'#FFF0F0', borderColor:C.danger },
    toastIcon:{ fontSize:17, fontWeight:'800' },
    toastTxt:{ fontSize:13, fontWeight:'600', color:C.dark, flex:1 },
    sqRow:{ flexDirection:'row', gap:3, alignItems:'center' },
    sq:{ width:6, height:6, borderRadius:1.5, backgroundColor:C.purple },
    sqLight:{ backgroundColor:'rgba(255,255,255,0.7)' },
    viewerBlur:{ flex:1 },
    viewerOverlay:{ flex:1, justifyContent:'center', alignItems:'center', padding:Spacing.xl },
    viewerContent:{ width:'100%', maxWidth:340, alignItems:'center' },
    viewerImage:{ width:'100%', height:340, borderRadius:Radius.lg },
    viewerBtn:{ marginTop:Spacing.lg, backgroundColor:C.white, borderRadius:Radius.md, height:44, width:'100%', alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.15, shadowRadius:Spacing.sm, elevation:8 },
    viewerBtnTxt:{ fontSize:14, fontWeight:'700', color:C.dark },
    viewerClose:{ position:'absolute', top:-8, right:-8, width:32, height:32, borderRadius:16, backgroundColor:'rgba(0,0,0,0.5)', alignItems:'center', justifyContent:'center' },
    viewerCloseTxt:{ fontSize:16, fontWeight:'700', color:C.white, lineHeight:17 },
  }), [C]);
  const [user, setUserState] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [dotButton, setDotButton] = useState<'cancel' | 'save' | null>(null);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'} | null>(null);

  const cardEntry = useSharedValue(0);
  const editScale = useSharedValue(1);
  const cancelScale = useSharedValue(1);
  const dangerScale = useSharedValue(1);
  const cancelDotSlide = useSharedValue(0);
  const saveDotSlide = useSharedValue(0);
  const viewerEntry = useSharedValue(0);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardEntry.value,
    transform: [
      { scale: 0.85 + cardEntry.value * 0.15 },
      { translateY: (1 - cardEntry.value) * 30 },
    ],
  }));

  const viewerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: viewerEntry.value,
    transform: [
      { scale: 0.7 + viewerEntry.value * 0.3 },
      { translateY: (1 - viewerEntry.value) * 60 },
    ],
  }));

  const editStyle = useAnimatedStyle(() => ({ transform: [{ scale: editScale.value }] }));
  const cancelStyle = useAnimatedStyle(() => ({ transform: [{ scale: cancelScale.value }] }));
  const dangerStyle = useAnimatedStyle(() => ({ transform: [{ scale: dangerScale.value }] }));
  const cancelDot1 = useAnimatedStyle(() => ({ transform: [{ translateX: cancelDotSlide.value }] }));
  const cancelDot2 = useAnimatedStyle(() => ({ transform: [{ translateX: -cancelDotSlide.value }] }));
  const saveDot1 = useAnimatedStyle(() => ({ transform: [{ translateX: saveDotSlide.value }] }));
  const saveDot2 = useAnimatedStyle(() => ({ transform: [{ translateX: -saveDotSlide.value }] }));

  useEffect(() => {
    setUserState(getUser());
  }, []);

  useEffect(() => {
    if (showEdit) {
      cardEntry.value = withSpring(1, { damping: 14, stiffness: 100 });
    } else {
      cardEntry.value = 0;
      cancelDotSlide.value = 0;
      saveDotSlide.value = 0;
      setDotButton(null);
    }
  }, [showEdit]);

  useEffect(() => {
    if (showViewer) {
      viewerEntry.value = withSpring(1, { damping: 14, stiffness: 100 });
    } else {
      viewerEntry.value = 0;
    }
  }, [showViewer]);

  const openEdit = () => {
    setPrenom(user?.prenom || '');
    setNom(user?.nom || '');
    setTelephone(user?.telephone || '');
    setShowEdit(true);
  };

  const showToast = (message:string, type:'success'|'error') => {
    setToast({ message, type });
    toastOpacity.value = withTiming(1, { duration: 300 });
    setTimeout(() => {
      toastOpacity.value = withTiming(0, { duration: 300 });
      setTimeout(() => setToast(null), 300);
    }, 3000);
  };

  const handleSave = async () => {
    if (saving) return;
    try {
      if (!prenom.trim() || !nom.trim()) {
        Alert.alert('Erreur', 'Le prénom et le nom sont requis');
        return;
      }
      setSaving(true);
      await api.users.update({ prenom: prenom.trim(), nom: nom.trim(), telephone: telephone.trim() });
      const updated = { ...user, prenom: prenom.trim(), nom: nom.trim(), telephone: telephone.trim() };
      setUser(updated);
      setUserState(updated);
      setSaving(false);
      await new Promise(r => setTimeout(r, 600));
      setShowEdit(false);
      showToast('Profil modifié avec succès ✓', 'success');
    } catch (e: any) {
      setSaving(false);
      await new Promise(r => setTimeout(r, 600));
      setShowEdit(false);
      showToast(e?.message || 'Erreur lors de la modification', 'error');
    }
  };

  const handlePhotoUpload = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      const data = await api.uploadPhoto(uri);
      const updated = { ...user, photo: data.utilisateur.photo };
      setUser(updated);
      setUserState(updated);
      showToast('Photo mise à jour ✓', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Erreur lors du changement de photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const pickImageWeb = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const uri = URL.createObjectURL(file);
      await handlePhotoUpload(uri);
      URL.revokeObjectURL(uri);
    };
    input.click();
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', 'Autorisation d\'accès à la galerie requise.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await handlePhotoUpload(result.assets[0].uri);
    }
  };

  const pickCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', 'Autorisation d\'accès à la caméra requise.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await handlePhotoUpload(result.assets[0].uri);
    }
  };

  const handleDeletePhoto = async () => {
    try {
      const data = await api.users.deletePhoto();
      const updated = { ...user, photo: data.utilisateur.photo };
      setUser(updated);
      setUserState(updated);
      showToast('Photo supprimée ✓', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Erreur lors de la suppression', 'error');
    }
  };

  const showPhotoOptions = () => {
    const options: any[] = [];
    if (Platform.OS !== 'web') {
      options.push({ text: '📷 Appareil photo', onPress: pickCamera });
    }
    options.push({ text: '🖼 Galerie', onPress: Platform.OS === 'web' ? pickImageWeb : pickImage });
    if (photoUrl) {
      options.push({ text: '🗑 Supprimer la photo', onPress: handleDeletePhoto, style: 'destructive' });
    }
    options.push({ text: 'Annuler', style: 'cancel' });
    Alert.alert('Photo de profil', 'Choisissez une source', options);
  };

  const handleAvatarPress = () => {
    if (photoUrl) {
      setShowViewer(true);
    } else {
      showPhotoOptions();
    }
  };

  const photoUrl = user?.photo ? `${API_BASE.replace('/api', '')}${user.photo}` : null;

  const initials = user ? `${(user.prenom||'')[0]||''}${(user.nom||'')[0]||''}` : 'U';
  const fullName = user ? `${user.prenom} ${user.nom}` : 'Utilisateur';

  const fields = [
    { lbl:'Prénom', key:'prenom' },
    { lbl:'Nom', key:'nom' },
    { lbl:'Email', key:'email' },
    { lbl:'Téléphone', key:'telephone' },
  ];

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <PageHeader title="Mon Profil" icon="👤" color={C.dark} />
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.body}>
          <View style={s.avatarSection}>
            <Pressable onPress={handleAvatarPress} style={s.avatarWrap}>
              {photoUrl ? (
                <Image source={photoUrl} style={s.avatarImage} contentFit="cover" />
              ) : (
                <View style={s.avatar}><Text style={s.avatarTxt}>{initials}</Text></View>
              )}
              <View style={s.cameraBadge}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.cameraIco}>📷</Text>
                )}
              </View>
            </Pressable>
            <Text style={s.name}>{fullName}</Text>
            <Text style={s.email}>{user?.email || 'email@exemple.com'}</Text>
          </View>
          {toast && (
            <Animated.View style={[s.toast, toast.type==='success' ? s.toastSuccess : s.toastError, toastAnimStyle]}>
              <Text style={[s.toastIcon, { color: toast.type==='success' ? C.success : C.danger }]}>{toast.type==='success' ? '✓' : '✕'}</Text>
              <Text style={s.toastTxt}>{toast.message}</Text>
            </Animated.View>
          )}
          {fields.map((f,i)=>(
            <View key={i} style={s.field}>
              <Text style={s.fieldLbl}>{f.lbl}</Text>
              <Text style={s.fieldVal}>
                {f.key === 'telephone' ? (user?.[f.key] || 'Non renseigné') : (user?.[f.key] || '-')}
              </Text>
            </View>
          ))}
          <Animated.View style={editStyle}>
            <Pressable
              style={({pressed})=>[s.btn, pressed && s.btnPressed]}
              onPress={openEdit}
              onPressIn={()=>editScale.value=withSpring(0.95)}
              onPressOut={()=>editScale.value=withSpring(1,{damping:8,stiffness:200})}
            >
              <Text style={s.btnTxt}>✏️ Modifier le profil</Text>
            </Pressable>
          </Animated.View>
          <Animated.View style={dangerStyle}>
            <Pressable
              style={({pressed})=>[s.btnDanger, pressed && s.btnDangerPressed]}
              onPress={()=>{clearAuth();router.replace('/')}}
              onPressIn={()=>dangerScale.value=withSpring(0.95)}
              onPressOut={()=>dangerScale.value=withSpring(1,{damping:8,stiffness:200})}
            >
              <Text style={s.btnDangerTxt}>🚪 Se déconnecter</Text>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
      </View>

      <Modal visible={showEdit} transparent animationType="none" onRequestClose={()=>setShowEdit(false)}>
        <BlurView intensity={15} tint="dark" style={s.blur} pointerEvents="box-none">
          <ScrollView contentContainerStyle={s.overlay} keyboardShouldPersistTaps="handled">
            <Animated.View style={[s.modalCard, cardAnimatedStyle]}>
                <View style={s.modalHeader}>
                  <View style={s.modalHeaderText}>
                    <Text style={s.modalTitle}>Modifier le profil</Text>
                    <Text style={s.modalSubtitle}>Modifiez vos informations personnelles</Text>
                  </View>
                  <Pressable onPress={()=>setShowEdit(false)} style={s.closeBtn} hitSlop={8}>
                    <Text style={s.closeBtnTxt}>✕</Text>
                  </Pressable>
                </View>

                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Prénom</Text>
                    <TextInput
                      style={[s.input, focusedField==='prenom' && s.inputFocused]}
                      value={prenom} onChangeText={setPrenom}
                      placeholder="Votre prénom" placeholderTextColor={C.hint}
                      onFocus={()=>setFocusedField('prenom')} onBlur={()=>setFocusedField(null)}
                    />
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Nom</Text>
                    <TextInput
                      style={[s.input, focusedField==='nom' && s.inputFocused]}
                      value={nom} onChangeText={setNom}
                      placeholder="Votre nom" placeholderTextColor={C.hint}
                      onFocus={()=>setFocusedField('nom')} onBlur={()=>setFocusedField(null)}
                    />
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Téléphone</Text>
                    <TextInput
                      style={[s.input, focusedField==='telephone' && s.inputFocused]}
                      value={telephone} onChangeText={setTelephone}
                      placeholder="Votre numéro de téléphone" placeholderTextColor={C.hint}
                      keyboardType="phone-pad"
                      onFocus={()=>setFocusedField('telephone')} onBlur={()=>setFocusedField(null)}
                    />
                  </View>

                  <View style={s.modalActions}>
                    <Animated.View style={[s.btnHalf, cancelStyle]}>
                      <Pressable
                        style={({pressed})=>[s.btnCancel, pressed && s.btnCancelPressed]}
                        onPress={()=>setTimeout(()=>setShowEdit(false), 600)}
                        onPressIn={()=>{
                          cancelScale.value=withSpring(0.95);
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
                      style={({pressed})=>[s.btnSave, pressed && s.btnSavePressed, saving && s.btnSaveDisabled]}
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
            </Animated.View>
          </ScrollView>
        </BlurView>
      </Modal>

      {/* ── Visualiseur photo plein écran ──────── */}
      <Modal visible={showViewer} transparent animationType="none" onRequestClose={()=>setShowViewer(false)}>
        <BlurView intensity={30} tint="dark" style={s.viewerBlur}>
          <Pressable style={s.viewerOverlay} onPress={()=>setShowViewer(false)}>
            <Animated.View style={[s.viewerContent, viewerAnimatedStyle]}>
              {photoUrl && (
                <Image source={photoUrl} style={s.viewerImage} contentFit="contain" />
              )}
              <TouchableOpacity
                style={s.viewerBtn}
                onPress={() => { setShowViewer(false); showPhotoOptions(); }}
                activeOpacity={0.85}
              >
                <Text style={s.viewerBtnTxt}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.viewerClose} onPress={()=>setShowViewer(false)} activeOpacity={0.7}>
                <Text style={s.viewerCloseTxt}>✕</Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </BlurView>
      </Modal>

    </View>
  );
}



