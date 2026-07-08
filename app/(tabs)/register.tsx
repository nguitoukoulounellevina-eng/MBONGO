import { router } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator, Alert,
  Animated,
  Keyboard, Platform, Pressable, ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import api, { setToken, setUser, getToken, getUser, resetOnboardingDone, resetGuidedTourDone } from '@/app/services/api';
import { Spacing, Radius } from '@/constants/spacing';
import { useTheme } from '@/app/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { isValidEmail, getPasswordErrors } from '@/app/utils/validation';

const STEPS = ['Identité', 'Sécurité', 'Confirmation'];

export default function Register() {
  const { colors: C, isDark } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: Spacing.lg },
    heroCard: { backgroundColor: isDark ? C.white : C.dark, margin: Spacing.lg, borderRadius: 28, padding: Spacing.xl, overflow: 'hidden', position: 'relative' },
    ring1: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)', top: -80, right: -60 },
    ring2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(167,139,250,0.08)', bottom: -40, left: -20 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    logoMark: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },
    logoIcon: { fontSize: 17 },
    logoName: { fontSize: 14, fontWeight: '800', color: C.white, letterSpacing: -0.3 },
    logoVersion: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
    onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(167,139,250,0.15)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', borderRadius: 50, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md },
    onlineDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.green },
    onlineTxt: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
    heroTitle: { fontSize: 24, fontWeight: '800', color: C.white, letterSpacing: -0.8, lineHeight: 30, marginBottom: Spacing.xs },
    heroAccent: { color: C.purpleL },
    heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 20 },
    stepperRow: { flexDirection: 'row', alignItems: 'center' },
    stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    stepCircle: { width: 24, height: 24, borderRadius: Radius.md, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
    stepCircleOn: { borderColor: C.purpleL, backgroundColor: 'rgba(167,139,250,0.2)' },
    stepCircleDone: { backgroundColor: C.purple, borderColor: C.purple },
    stepNum: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
    stepNumOn: { color: C.purpleL },
    stepCheck: { fontSize: 10, fontWeight: '700', color: C.white },
    stepLbl: { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
    stepLblOn: { color: 'rgba(255,255,255,0.9)' },
    stepLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 6 },
    stepLineDone: { backgroundColor: C.purple },
    formCard: { backgroundColor: C.white, marginHorizontal: Spacing.lg, borderRadius: 28, padding: Spacing.xl, marginTop: -Spacing.sm, shadowColor: '#0D0828', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: Spacing.xl, elevation: 6 },
    stepTitle: { fontSize: 18, fontWeight: '800', color: C.dark, letterSpacing: -0.4, marginBottom: 3 },
    stepDesc: { fontSize: 12, color: C.muted, marginBottom: Spacing.lg },
    row2: { flexDirection: 'row', gap: Spacing.md },
    field: { marginBottom: Spacing.md },
    lbl: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: C.muted, marginBottom: 5 },
    inp: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: C.surface, borderRadius: Radius.md, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: Spacing.md, height: 48 },
    ico: { fontSize: 15 },
    inpTxt: { flex: 1, color: C.text, fontSize: 13, fontWeight: '500' },
    strengthBar: { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
    strengthFill: { height: 4, borderRadius: 2 },
    strengthLbl: { fontSize: 10, fontWeight: '600', marginTop: 3 },
    tipsBox: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.xs },
    tipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 5 },
    tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
    tipTxt: { fontSize: 11, color: C.muted },
    recapCard: { backgroundColor: C.surface, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md },
    recapAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
    recapAvatarTxt: { fontSize: 18, fontWeight: '800', color: C.white },
    recapName: { fontSize: 16, fontWeight: '800', color: C.dark, letterSpacing: -0.3 },
    recapEmail: { fontSize: 12, color: C.muted, marginTop: 2 },
    recapPhone: { fontSize: 12, color: C.muted, marginTop: 1 },
    infoRows: { marginBottom: Spacing.md },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.border },
    infoIco: { fontSize: 15 },
    infoLbl: { fontSize: 9, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
    infoVal: { fontSize: 12, fontWeight: '600', color: C.dark, marginTop: 1 },
    infoEdit: { fontSize: 10, color: C.purple, fontWeight: '700' },
    acceptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.lg },
    chk: { width: 18, height: 18, borderRadius: 5, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
    chkOff: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.border },
    chkIco: { color: C.white, fontSize: 10, fontWeight: '700' },
    acceptTxt: { fontSize: 11, color: C.muted, flex: 1, lineHeight: 16 },
    navRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
    btnBack: { flex: 1, height: 50, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
    btnBackTxt: { fontSize: 12, fontWeight: '700', color: C.dark },
    btnNext: { flex: 2, height: 50, borderRadius: Radius.lg, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
    btnNextTxt: { fontSize: 13, fontWeight: '800', color: C.white, letterSpacing: 0.2 },
    sslRow: { alignItems: 'center' },
    sslBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.surface, borderRadius: 50, paddingVertical: 5, paddingHorizontal: Spacing.md },
    sslTxt: { fontSize: 9, color: C.hint, fontWeight: '600', letterSpacing: 0.3 },
    overlay: { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.45)', alignItems:'center', justifyContent:'center', zIndex:100 },
    modalBox: { backgroundColor:C.white, marginHorizontal:32, borderRadius:24, padding:28, alignItems:'center', shadowColor:'#0D0828', shadowOffset:{width:0,height:12}, shadowOpacity:0.15, shadowRadius:30, elevation:12 },
    modalIcon: { fontSize:48, marginBottom:Spacing.md },
    modalTitle: { fontSize:18, fontWeight:'800', color:C.dark, textAlign:'center', marginBottom:6 },
    modalDesc: { fontSize:13, color:C.muted, textAlign:'center', marginBottom:20, lineHeight:20 },
    modalBtn: { backgroundColor:C.dark, borderRadius:Radius.lg, height:48, paddingHorizontal:40, alignItems:'center', justifyContent:'center', width:'100%' },
    modalBtnTxt: { color:C.white, fontSize:14, fontWeight:'800' },
  }), [C]);
  const [step, setStep]         = useState(0);
  const [nom, setNom]           = useState('');
  const [prenom, setPrenom]     = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [success, setSuccess] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const stepAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateStep = () => {
    Animated.sequence([
      Animated.timing(stepAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(stepAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const nextStep = async () => {
    if (step === 0) {
      if (!nom || !prenom || !email) {
        Alert.alert('Champs requis', 'Remplissez tous les champs.');
        return;
      }
      if (!isValidEmail(email)) {
        Alert.alert('E-mail invalide', 'Veuillez entrer une adresse e-mail valide (ex: nom@domaine.com).');
        return;
      }
      animateStep();
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!password || !confirm) {
        Alert.alert('Champs requis', 'Remplissez tous les champs.');
        return;
      }
      if (password !== confirm) {
        Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
        return;
      }
      const pwdErrors = getPasswordErrors(password);
      if (pwdErrors.length > 0) {
        Alert.alert('Mot de passe faible', pwdErrors.join('\n'));
        return;
      }
      animateStep();
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!accepted) {
        Alert.alert('Conditions', "Acceptez les conditions d'utilisation.");
        return;
      }
      setLoading(true);
      try {
        const res = await api.auth.register({
          prenom,
          nom,
          email,
          telephone: phone || undefined,
          mot_de_passe: password,
        });
        const token = res?.token || getToken();
        if (token) setToken(token);
        const user = res?.utilisateur || res?.user || getUser();
        if (user) setUser(user);
        setSuccess(true);
      } catch (err: any) {
        Alert.alert('Erreur', err.message || "Échec de l'inscription.");
      } finally {
        setLoading(false);
      }
    }
  };

  const prevStep = () => {
    if (step === 0) { router.back(); return; }
    animateStep();
    setStep(step - 1);
  };

  const strength = () => {
    if (!password) return { w: '0%', c: C.border, l: '' };
    if (password.length < 6) return { w: '33%', c: C.danger, l: 'Faible' };
    if (password.length < 10) return { w: '66%', c: C.warning, l: 'Moyen' };
    return { w: '100%', c: C.success, l: 'Fort' };
  };
  const pw = strength();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => Keyboard.dismiss()}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Hero Card ─────────────────────────────────── */}
          <View style={styles.heroCard}>
            <View style={styles.ring1} /><View style={styles.ring2} />
            <View style={styles.heroTop}>
              <View style={styles.logoRow}>
                <View style={styles.logoMark}><Text style={styles.logoIcon}>⚡</Text></View>
                <View>
                  <Text style={styles.logoName}>MBONGO</Text>
                  <Text style={styles.logoVersion}>v2.0 · Production</Text>
                </View>
              </View>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineTxt}>Inscription</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Créez votre{'\n'}<Text style={styles.heroAccent}>compte</Text></Text>
            <Text style={styles.heroSub}>Rejoignez 12K+ utilisateurs · Gratuit</Text>

            <View style={styles.stepperRow}>
              {STEPS.map((s, i) => (
                <View key={i} style={styles.stepItem}>
                  <View style={[styles.stepCircle, i <= step && styles.stepCircleOn, i < step && styles.stepCircleDone]}>
                    {i < step
                      ? <Text style={styles.stepCheck}>✓</Text>
                      : <Text style={[styles.stepNum, i === step && styles.stepNumOn]}>{i + 1}</Text>
                    }
                  </View>
                  <Text style={[styles.stepLbl, i === step && styles.stepLblOn]}>{s}</Text>
                  {i < 2 && <View style={[styles.stepLine, i < step && styles.stepLineDone]} />}
                </View>
              ))}
            </View>
          </View>

          {/* ── Form Card ─────────────────────────────────── */}
          <View style={styles.formCard}>

            {/* Étape 0 — Identité */}
            {step === 0 && (
              <View>
                <Text style={styles.stepTitle}>Vos informations</Text>
                <Text style={styles.stepDesc}>Dites-nous qui vous êtes</Text>
                <View style={styles.row2}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.lbl}>Prénom</Text>
                    <View style={styles.inp}>
                      <Text style={styles.ico}>👤</Text>
                      <TextInput style={styles.inpTxt} placeholder="Taper votre prénom" placeholderTextColor={C.hint} value={prenom} onChangeText={setPrenom} autoCapitalize="words" />
                    </View>
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.lbl}>Nom</Text>
                    <View style={styles.inp}>
                      <TextInput style={styles.inpTxt} placeholder="Taper votre nom" placeholderTextColor={C.hint} value={nom} onChangeText={setNom} autoCapitalize="words" />
                    </View>
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.lbl}>Adresse e-mail</Text>
                  <View style={styles.inp}>
                    <Text style={styles.ico}>✉️</Text>
                    <TextInput style={styles.inpTxt} placeholder="Taper votre email" placeholderTextColor={C.hint} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.lbl}>Téléphone (optionnel)</Text>
                  <View style={styles.inp}>
                    <Text style={styles.ico}>📱</Text>
                    <TextInput style={styles.inpTxt} placeholder="Taper votre téléphone" placeholderTextColor={C.hint} value={phone} onChangeText={setPhone} keyboardType="phone-pad" returnKeyType="done" />
                  </View>
                </View>
              </View>
            )}

            {/* Étape 1 — Sécurité */}
            {step === 1 && (
              <View>
                <Text style={styles.stepTitle}>Sécurisez votre compte</Text>
                <Text style={styles.stepDesc}>Choisissez un mot de passe robuste</Text>
                <View style={styles.field}>
                  <Text style={styles.lbl}>Mot de passe</Text>
                  <View style={styles.inp}>
                    <Text style={styles.ico}>🔒</Text>
                    <TextInput style={[styles.inpTxt, { flex: 1 }]} placeholder="Taper votre mot de passe" placeholderTextColor={C.hint} value={password} onChangeText={setPassword} secureTextEntry={!showPass} />
                    <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                      <Text style={{ fontSize: 15, color: C.hint }}>{showPass ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  {password.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <View style={styles.strengthBar}>
                        <View style={[styles.strengthFill, { width: pw.w, backgroundColor: pw.c }]} />
                      </View>
                      <Text style={[styles.strengthLbl, { color: pw.c }]}>{pw.l}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.field}>
                  <Text style={styles.lbl}>Confirmer le mot de passe</Text>
                  <View style={[styles.inp, confirm && confirm !== password && { borderColor: '#FF4D6A' }]}>
                    <Text style={styles.ico}>🔒</Text>
                    <TextInput style={[styles.inpTxt, { flex: 1 }]} placeholder="Confirmer votre mot de passe" placeholderTextColor={C.hint} value={confirm} onChangeText={setConfirm} secureTextEntry={!showConf} />
                    <TouchableOpacity onPress={() => setShowConf(!showConf)}>
                      <Text style={{ fontSize: 15, color: C.hint }}>{showConf ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  {confirm.length > 0 && confirm === password && (
                    <Text style={{ fontSize: 10, color: C.success, marginTop: 4 }}>✓ Les mots de passe correspondent</Text>
                  )}
                </View>
                <View style={styles.tipsBox}>
                  {['Au moins 6 caractères', 'Une majuscule recommandée', 'Un chiffre recommandé'].map((t, i) => (
                    <View key={i} style={styles.tipRow}>
                      <View style={[styles.tipDot, password.length >= [6, 8, 10][i] && { backgroundColor: C.success }]} />
                      <Text style={styles.tipTxt}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Étape 2 — Confirmation */}
            {step === 2 && (
              <View>
                <Text style={styles.stepTitle}>Récapitulatif</Text>
                <Text style={styles.stepDesc}>Vérifiez vos informations</Text>
                <View style={styles.recapCard}>
                  <View style={styles.recapAvatar}>
                    <Text style={styles.recapAvatarTxt}>{prenom.charAt(0)}{nom.charAt(0)}</Text>
                  </View>
                  <Text style={styles.recapName}>{prenom} {nom}</Text>
                  <Text style={styles.recapEmail}>{email}</Text>
                  {phone ? <Text style={styles.recapPhone}>{phone}</Text> : null}
                </View>
                <View style={styles.infoRows}>
                  {[
                    { ico: '✉️', lbl: 'Email', val: email, edit: 0 },
                    { ico: '🔒', lbl: 'Mot de passe', val: '••••••••', edit: 1 },
                    { ico: '📱', lbl: 'Téléphone', val: phone || 'Non renseigné', edit: 0 },
                  ].map((r, i) => (
                    <View key={i} style={styles.infoRow}>
                      <Text style={styles.infoIco}>{r.ico}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLbl}>{r.lbl}</Text>
                        <Text style={styles.infoVal}>{r.val}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setStep(r.edit)}>
                        <Text style={styles.infoEdit}>Modifier</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={styles.acceptRow} onPress={() => setAccepted(!accepted)}>
                  <View style={[styles.chk, !accepted && styles.chkOff]}>
                    {accepted && <Text style={styles.chkIco}>✓</Text>}
                  </View>
                  <Text style={styles.acceptTxt}>
                    J'accepte les <Text style={{ color: C.purple, fontWeight: '700' }}>conditions d'utilisation</Text> et la <Text style={{ color: C.purple, fontWeight: '700' }}>politique de confidentialité</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Navigation */}
            <View style={styles.navRow}>
              <TouchableOpacity style={styles.btnBack} onPress={prevStep} activeOpacity={0.8}>
<Ionicons name="chevron-back" size={14} color={C.text} style={{marginRight:4}} /><Text style={styles.btnBackTxt}>{step === 0 ? 'Connexion' : 'Retour'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnNext} onPress={nextStep} activeOpacity={0.88}>
                {loading
                  ? <ActivityIndicator color={C.white} />
                  :                   <View style={{flexDirection:'row', alignItems:'center'}}><Text style={styles.btnNextTxt}>{step === 2 ? 'Créer mon compte ✓' : 'Suivant'}</Text>{step !== 2 && <Ionicons name="chevron-forward" size={14} color="#FFF" style={{marginLeft:3}} />}</View>
                }
              </TouchableOpacity>
            </View>

            <View style={styles.sslRow}>
              <View style={styles.sslBadge}>
                <Text style={{ fontSize: 10 }}>🔐</Text>
                <Text style={styles.sslTxt}>Données chiffrées SSL 256-bit</Text>
              </View>
            </View>

          </View>

          {success && (
            <View style={styles.overlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalIcon}>✅</Text>
                <Text style={styles.modalTitle}>Inscription réussie</Text>
                <Text style={styles.modalDesc}>Votre compte a été créé avec succès !</Text>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={async () => {
                    await resetOnboardingDone();
                    await resetGuidedTourDone();
                    router.replace('/(auth)/onboarding');
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.modalBtnTxt}>Découvrir MBONGO</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

