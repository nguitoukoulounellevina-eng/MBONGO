import { router } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Animated,
  Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';
import api, { setToken, setUser, getOnboardingDone, resetOnboardingDone, resetGuidedTourDone } from '@/app/services/api';
import { Spacing, Radius } from '@/constants/spacing';
import { useTheme } from '@/app/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { isValidEmail, isValidPhone } from '@/app/utils/validation';

export default function Index() {
  const { colors: C, isDark } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    root:{ flex:1, backgroundColor:C.bg },
    scroll:{ flexGrow:1, justifyContent:'center', paddingVertical:Spacing.lg },
    heroCard:{ backgroundColor: isDark ? '#18113A' : C.dark, margin:Spacing.lg, borderRadius:28, padding:Spacing.xl, overflow:'hidden', position:'relative' },
    ring1:{ position:'absolute', width:220, height:220, borderRadius:110, borderWidth:1, borderColor:'rgba(167,139,250,0.15)', top:-70, right:-50 },
    ring2:{ position:'absolute', width:140, height:140, borderRadius:70, borderWidth:1, borderColor:'rgba(167,139,250,0.1)', top:-20, right:-5 },
    ring3:{ position:'absolute', width:70, height:70, borderRadius:35, backgroundColor:'rgba(167,139,250,0.06)', bottom:-15, left:Spacing.lg },
    heroTop:{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:Spacing.lg },
    logoRow:{ flexDirection:'row', alignItems:'center', gap:Spacing.sm },
    logoMark:{ width:34, height:34, borderRadius:Radius.md, backgroundColor:C.purple, alignItems:'center', justifyContent:'center' },
    logoIcon:{ fontSize:16 },
    logoName:{ fontSize:13, fontWeight:'800', color:'#FFF', letterSpacing:-0.3 },
    logoVersion:{ fontSize:8, color:'rgba(255,255,255,0.4)', marginTop:1 },
    onlineBadge:{ flexDirection:'row', alignItems:'center', gap:Spacing.xs, backgroundColor:'rgba(167,139,250,0.15)', borderWidth:1, borderColor:'rgba(167,139,250,0.25)', borderRadius:50, paddingVertical:3, paddingHorizontal:Spacing.sm },
    onlineDot:{ width:5, height:5, borderRadius:3, backgroundColor:C.green },
    onlineTxt:{ fontSize:7, fontWeight:'700', color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:0.5 },
    heroTitle:{ fontSize:22, fontWeight:'800', color:'#FFF', letterSpacing:-0.8, lineHeight:28 },
    heroAccent:{ color: isDark ? '#C4B5FD' : C.purpleL },
    heroSub:{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:5, marginBottom:Spacing.lg },
    metricsRow:{ flexDirection:'row', alignItems:'center' },
    metric:{ flex:1 },
    metricVal:{ fontSize:14, fontWeight:'800', color:'#FFF' },
    metricLbl:{ fontSize:7, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:0.5, marginTop:2 },
    metricSep:{ width:1, backgroundColor:'rgba(255,255,255,0.08)', height:24, marginHorizontal:Spacing.md },
    formCard:{ backgroundColor: isDark ? '#2D2156' : C.white, marginHorizontal:Spacing.lg, borderRadius:24, padding:Spacing.lg, marginTop:-Spacing.sm, borderWidth: isDark ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'transparent', shadowColor: isDark ? '#000' : '#0D0828', shadowOffset:{width:0,height:6}, shadowOpacity: isDark ? 0.3 : 0.05, shadowRadius:20, elevation:5 },
    tabsWrap:{ flexDirection:'row', backgroundColor:C.surface, borderRadius:Radius.md, padding:3, marginBottom:Spacing.lg, position:'relative', overflow:'hidden' },
    tabBg:{ position:'absolute', top:3, width:'48%', height:'89%', backgroundColor: isDark ? C.purple : C.dark, borderRadius:Radius.sm, zIndex:0 },
    tabBtn:{ flex:1, paddingVertical:Spacing.sm, alignItems:'center', zIndex:1 },
    tabTxt:{ fontSize:11, fontWeight:'700', color:C.muted },
    tabTxtOn:{ color:'#FFF' },
    successBox:{ backgroundColor:'rgba(34,197,94,0.12)', borderRadius:Radius.md, padding:Spacing.md, marginBottom:Spacing.md, borderWidth:1, borderColor:C.success },
    successTxt:{ fontSize:11, color:C.green, fontWeight:'600', textAlign:'center' },
    field:{ marginBottom:Spacing.md },
    lbl:{ fontSize:9, fontWeight:'700', letterSpacing:0.8, textTransform:'uppercase', color: isDark ? 'rgba(255,255,255,0.7)' : C.muted, marginBottom:Spacing.xs },
    inp:{ flexDirection:'row', alignItems:'center', gap:Spacing.sm, backgroundColor:C.surface, borderRadius:Radius.md, borderWidth:1.5, borderColor: isDark ? 'rgba(255,255,255,0.15)' : C.border, paddingHorizontal:Spacing.md, height:44 },
    inpFocus:{ borderColor: isDark ? C.purpleL : C.dark, backgroundColor: isDark ? '#2D2156' : C.white },
    inpError:{ borderColor:C.danger, backgroundColor:'rgba(244,63,94,0.08)' },
    ico:{ fontSize:14, color: isDark ? 'rgba(255,255,255,0.45)' : C.hint },
    inpTxt:{ flex:1, color:C.text, fontSize:12, fontWeight:'500' },
    fieldError:{ fontSize:9, color:C.danger, fontWeight:'600', marginTop:3, marginLeft:3 },
    rowBtw:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:Spacing.lg },
    fgtTxt:{ fontSize:10, color:C.purple, fontWeight:'700' },
    loadingRow:{ flexDirection:'row', alignItems:'center', gap:7, marginBottom:Spacing.md, paddingHorizontal:3 },
    loadingTxt:{ fontSize:10, color:C.purple, fontWeight:'600' },
    cta:{ backgroundColor: isDark ? C.purple : C.dark, borderRadius:Radius.md, height:48, alignItems:'center', justifyContent:'center', marginBottom:Spacing.sm },
    ctaTxt:{ color:'#FFF', fontSize:13, fontWeight:'800', letterSpacing:0.3 },
    signupRow:{ flexDirection:'row', justifyContent:'center', marginBottom:Spacing.md },
    signupTxt:{ fontSize:10, color:C.muted },
    signupLink:{ fontSize:10, color:C.dark, fontWeight:'800' },
  }), [C]);
  const [mode, setMode]             = useState('Email');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [phone, setPhone]           = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus]   = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passError, setPassError]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const tabSlide  = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue:1, duration:700, useNativeDriver:true }),
      Animated.timing(slideAnim, { toValue:0, duration:700, useNativeDriver:true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!blockedUntil) return;
    const id = setInterval(() => {
      const rest = blockedUntil.getTime() - Date.now();
      if (rest <= 0) {
        setBlockedUntil(null);
        setCountdown('');
        clearInterval(id);
      } else {
        const m = Math.floor(rest / 60000);
        const s = Math.floor((rest % 60000) / 1000);
        setCountdown(`${m}:${s.toString().padStart(2,'0')}`);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [blockedUntil]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:8,  duration:60, useNativeDriver:true }),
      Animated.timing(shakeAnim, { toValue:-8, duration:60, useNativeDriver:true }),
      Animated.timing(shakeAnim, { toValue:6,  duration:60, useNativeDriver:true }),
      Animated.timing(shakeAnim, { toValue:0,  duration:60, useNativeDriver:true }),
    ]).start();
  };

  const clearErrors = () => {
    setEmailError(''); setPassError(''); setSuccessMsg('');
  };

  const switchMode = (m) => {
    setMode(m); clearErrors(); setBlockedUntil(null); setCountdown('');
    Animated.timing(tabSlide, {
      toValue: m==='Email' ? 0 : 1,
      duration: 280,
      useNativeDriver: false,
    }).start();
  };

  const tabLeft = tabSlide.interpolate({
    inputRange:[0,1], outputRange:['1.5%','51%'],
  });

  const handleSubmit = async () => {
    clearErrors();

    // Vérification champs vides (Frontend)
    if (mode === 'Téléphone') {
      if (!phone || !isValidPhone(phone)) {
        setEmailError('Numéro de téléphone invalide (au moins 8 chiffres).');
        shake(); return;
      }
      if (!password) {
        setPassError('Le mot de passe est obligatoire.');
        shake(); return;
      }
      setLoading(true);
      setLoadingMsg('Connexion en cours...');
      try {
        const res = await api.auth.loginByPhone(phone, password);
        setToken(res.token);
        setUser(res.utilisateur);
        setBlockedUntil(null); setCountdown('');
        setLoading(false); setLoadingMsg('');
        setSuccessMsg('Connexion réussie ! Redirection...');
        const onboarding = await getOnboardingDone();
        if (!onboarding) { await resetOnboardingDone(); await resetGuidedTourDone(); }
        setTimeout(() => router.push(onboarding ? '/(tabs)/home' : '/(auth)/onboarding'), 1200);
      } catch (err: any) {
        setLoading(false); setLoadingMsg('');
        const msg = err.message || 'Échec de la connexion.';
        if (err.status === 429) {
          const match = msg.match(/dans (\d+) minute/);
          if (match) setBlockedUntil(new Date(Date.now() + parseInt(match[1]) * 60 * 1000));
        }
        setEmailError(msg);
        shake();
      }
      return;
    }

    if (mode === 'Email') {
      let hasError = false;
      if (!email.trim()) {
        setEmailError("L'adresse e-mail est obligatoire.");
        hasError = true;
      } else if (!isValidEmail(email)) {
        setEmailError('Format d\'e-mail invalide.');
        hasError = true;
      }
      if (!password) {
        setPassError('Le mot de passe est obligatoire.');
        hasError = true;
      }
      if (hasError) { shake(); return; }
    }

    // Appel API Backend
    setLoading(true);
    setLoadingMsg('Connexion en cours...');
    try {
      const res = await api.auth.login(email, password);
      setToken(res.token);
      setUser(res.utilisateur);
      setBlockedUntil(null); setCountdown('');
      setLoading(false); setLoadingMsg('');
      setSuccessMsg('Connexion réussie ! Redirection...');
      const onboarding = await getOnboardingDone();
      if (!onboarding) { await resetOnboardingDone(); await resetGuidedTourDone(); }
      setTimeout(() => router.push(onboarding ? '/(tabs)/home' : '/(auth)/onboarding'), 1200);
    } catch (err: any) {
      setLoading(false); setLoadingMsg('');
      const msg = err.message || 'Échec de la connexion.';
      if (err.status === 429) {
        setEmailError(msg);
        const match = msg.match(/dans (\d+) minute/);
        if (match) {
          const minutes = parseInt(match[1]);
          setBlockedUntil(new Date(Date.now() + minutes * 60 * 1000));
        }
      } else if (msg.toLowerCase().includes('email')) {
        setEmailError(msg);
      } else {
        setPassError(msg);
      }
      shake();
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
            <Pressable onPress={() => Platform.OS !== 'web' && Keyboard.dismiss()}>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <KeyboardAvoidingView behavior="padding">
            <Animated.View style={{ transform:[{translateX:shakeAnim}] }}>

              {/* ── Hero Card ─────────────────── */}
              <View style={styles.heroCard}>
                <View style={styles.ring1}/><View style={styles.ring2}/><View style={styles.ring3}/>
                <View style={styles.heroTop}>
                  <View style={styles.logoRow}>
                    <View style={styles.logoMark}><Text style={styles.logoIcon}>⚡</Text></View>
                    <View>
                      <Text style={styles.logoName}>MBONGO</Text>
                      <Text style={styles.logoVersion}>v2.0 · Production</Text>
                    </View>
                  </View>
                  <View style={styles.onlineBadge}>
                    <View style={styles.onlineDot}/>
                    <Text style={styles.onlineTxt}>En ligne</Text>
                  </View>
                </View>
                <Text style={styles.heroTitle}>Accédez à{'\n'}votre <Text style={styles.heroAccent}>espace</Text></Text>
                <Text style={styles.heroSub}>Authentification sécurisée · SSL 256-bit</Text>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}><Text style={styles.metricVal}>12K+</Text><Text style={styles.metricLbl}>Utilisateurs</Text></View>
                  <View style={styles.metricSep}/>
                  <View style={styles.metric}><Text style={styles.metricVal}>99.9%</Text><Text style={styles.metricLbl}>Uptime</Text></View>
                  <View style={styles.metricSep}/>
                  <View style={styles.metric}><Text style={styles.metricVal}>4.9★</Text><Text style={styles.metricLbl}>Note</Text></View>
                </View>
              </View>

              {/* ── Form Card ─────────────────── */}
              <View style={styles.formCard}>

                <View style={styles.tabsWrap}>
                  <Animated.View style={[styles.tabBg, {left:tabLeft}]}/>
                  {['Email','Téléphone'].map(m => (
                    <TouchableOpacity key={m} style={styles.tabBtn} onPress={()=>switchMode(m)} activeOpacity={0.8}>
                      <Text style={[styles.tabTxt, mode===m && styles.tabTxtOn]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Succès */}
                {successMsg ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successTxt}>✅ {successMsg}</Text>
                  </View>
                ) : null}

                {/* Email form */}
                {mode==='Email' && (
                  <View>
                    <View style={styles.field}>
                      <Text style={styles.lbl}>Adresse e-mail</Text>
                      <View style={[styles.inp, emailFocus && styles.inpFocus, emailError && styles.inpError]}>
                        <Text style={styles.ico}>✉️</Text>
                        <TextInput
                          style={styles.inpTxt}
                          placeholder="Taper votre email"
                          placeholderTextColor={C.hint}
                          value={email}
                          onChangeText={t => { setEmail(t); setEmailError(''); }}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          onFocus={()=>setEmailFocus(true)}
                          onBlur={()=>setEmailFocus(false)}
                        />
                      </View>
                      {emailError ? <Text style={styles.fieldError}>⚠ {emailError}</Text> : null}
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.lbl}>Mot de passe</Text>
                      <View style={[styles.inp, passFocus && styles.inpFocus, passError && styles.inpError]}>
                        <Text style={styles.ico}>🔒</Text>
                        <TextInput
                          style={[styles.inpTxt,{flex:1}]}
                          placeholder="Taper votre mot de passe"
                          placeholderTextColor={C.hint}
                          value={password}
                          onChangeText={t => { setPassword(t); setPassError(''); }}
                          secureTextEntry={!showPass}
                          onFocus={()=>setPassFocus(true)}
                          onBlur={()=>setPassFocus(false)}
                        />
                        <TouchableOpacity onPress={()=>setShowPass(!showPass)}>
                          <Text style={{fontSize:14,color:C.hint}}>{showPass?'🙈':'👁️'}</Text>
                        </TouchableOpacity>
                      </View>
                      {passError ? <Text style={styles.fieldError}>⚠ {passError}</Text> : null}
                    </View>

                    <View style={styles.rowBtw}>
                      <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                        <Text style={styles.fgtTxt}>Mot de passe oublié ?</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Phone form */}
                {mode==='Téléphone' && (
                  <View>
                    <View style={styles.field}>
                      <Text style={styles.lbl}>Numéro de téléphone</Text>
                      <View style={[styles.inp, emailError && styles.inpError]}>
                        <Text style={styles.ico}>📱</Text>
                        <TextInput
                          style={styles.inpTxt}
                          placeholder="Taper votre téléphone"
                          placeholderTextColor={C.hint}
                          value={phone}
                          onChangeText={t => { setPhone(t); setEmailError(''); }}
                          keyboardType="phone-pad"
                        />
                      </View>
                      {emailError ? <Text style={styles.fieldError}>⚠ {emailError}</Text> : null}
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.lbl}>Mot de passe</Text>
                      <View style={[styles.inp, passFocus && styles.inpFocus, passError && styles.inpError]}>
                        <Text style={styles.ico}>🔒</Text>
                        <TextInput
                          style={[styles.inpTxt,{flex:1}]}
                          placeholder="Taper votre mot de passe"
                          placeholderTextColor={C.hint}
                          value={password}
                          onChangeText={t => { setPassword(t); setPassError(''); }}
                          secureTextEntry={!showPass}
                          onFocus={()=>setPassFocus(true)}
                          onBlur={()=>setPassFocus(false)}
                        />
                        <TouchableOpacity onPress={()=>setShowPass(!showPass)}>
                          <Text style={{fontSize:14,color:C.hint}}>{showPass?'🙈':'👁️'}</Text>
                        </TouchableOpacity>
                      </View>
                      {passError ? <Text style={styles.fieldError}>⚠ {passError}</Text> : null}
                    </View>
                  </View>
                )}

                {/* Loading msg */}
                {loading && loadingMsg ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={C.purple}/>
                    <Text style={styles.loadingTxt}>{loadingMsg}</Text>
                  </View>
                ) : null}

                {/* CTA */}
                <TouchableOpacity
                  style={[styles.cta, (loading||!!blockedUntil) && {opacity:0.6}]}
                  onPress={handleSubmit}
                  activeOpacity={0.88}
                  disabled={loading||!!blockedUntil}
                >
                  {loading && !loadingMsg
                    ? <ActivityIndicator color={C.white}/>
                    : blockedUntil
                      ? <Text style={styles.ctaTxt}>🔒 Réessayer dans {countdown}</Text>
                      :                       <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center'}}><Text style={styles.ctaTxt}>Se connecter </Text><Ionicons name="chevron-forward" size={14} color="#FFF" /></View>
                  }
                </TouchableOpacity>

                {/* ✅ S'inscrire */}
                <View style={styles.signupRow}>
                  <Text style={styles.signupTxt}>Pas encore de compte ? </Text>
                  <TouchableOpacity onPress={()=>router.push('/(tabs)/register')}>
                    <Text style={styles.signupLink}>S'inscrire</Text>
                  </TouchableOpacity>
                </View>

              </View>

            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

