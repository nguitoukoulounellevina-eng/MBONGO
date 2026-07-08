import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Keyboard, KeyboardAvoidingView,
  Platform, Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '@/app/services/api';
import { Spacing, Radius } from '@/constants/spacing';
import { C, HeroHeader, AuthCard, PrimaryButton } from '@/app/components/auth';
import { isValidEmail, getPasswordErrors } from '@/app/utils/validation';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email');
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSendCode = async () => {
    setError('');
    if (!email.trim()) {
      setError('Veuillez entrer votre adresse e-mail.');
      shake();
      return;
    }
    if (!isValidEmail(email)) {
      setError('Format d\'e-mail invalide.');
      shake();
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(email.trim());
      if (res.token) {
        setToken(res.token);
        setStep('reset');
      } else {
        setStep('done');
      }
    } catch (e: any) {
      setError(e.message || 'Une erreur est survenue.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (!password) {
      setError('Veuillez entrer un nouveau mot de passe.');
      shake();
      return;
    }
    const pwdErrors = getPasswordErrors(password);
    if (pwdErrors.length > 0) {
      setError(pwdErrors.join('\n'));
      shake();
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      shake();
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      setStep('done');
    } catch (e: any) {
      setError(e.message || 'Une erreur est survenue.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => Keyboard.dismiss()}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>

              {/* ── Hero Header ─────────────────── */}
              {step === 'email' && (
                <HeroHeader
                  title="Mot de passe "
                  accentText="oublié"
                  subtitle="Entrez votre adresse e-mail pour recevoir un code de réinitialisation."
                />
              )}
              {step === 'reset' && (
                <HeroHeader
                  title="Nouveau "
                  accentText="mot de passe"
                  subtitle="Choisissez un mot de passe robuste pour sécuriser votre compte."
                />
              )}
              {step === 'done' && (
                <HeroHeader
                  title="Mot de passe "
                  accentText="modifié"
                  subtitle="Votre mot de passe a été réinitialisé avec succès."
                />
              )}

              {/* ── Form Card ─────────────────── */}
              {step === 'email' && (
                <AuthCard>
                  <View style={s.field}>
                    <Text style={s.lbl}>Adresse e-mail</Text>
                    <View style={[s.inp, emailFocus && s.inpFocus, error && s.inpError]}>
                      <Text style={s.ico}>✉️</Text>
                      <TextInput
                        style={s.inpTxt}
                        placeholder="vous@exemple.com"
                        placeholderTextColor={C.hint}
                        value={email}
                        onChangeText={t => { setEmail(t); setError(''); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onFocus={() => setEmailFocus(true)}
                        onBlur={() => setEmailFocus(false)}
                      />
                    </View>
                    {error ? <Text style={s.fieldError}>⚠ {error}</Text> : null}
                  </View>
                  <PrimaryButton onPress={handleSendCode} label="Envoyer le code" loading={loading} />
                  <View style={s.signupRow}>
                    <Text style={s.signupTxt}>Vous vous souvenez ? </Text>
                    <TouchableOpacity onPress={() => router.back()}>
                      <Text style={s.signupLink}>Se connecter</Text>
                    </TouchableOpacity>
                  </View>
                </AuthCard>
              )}

              {step === 'reset' && (
                <AuthCard>
                  <View style={s.field}>
                    <Text style={s.lbl}>Nouveau mot de passe</Text>
                    <View style={[s.inp, passFocus && s.inpFocus, error && s.inpError]}>
                      <Text style={s.ico}>🔒</Text>
                      <TextInput
                        style={[s.inpTxt, { flex: 1 }]}
                        placeholder="••••••••"
                        placeholderTextColor={C.hint}
                        value={password}
                        onChangeText={t => { setPassword(t); setError(''); }}
                        secureTextEntry={!showPass}
                        onFocus={() => setPassFocus(true)}
                        onBlur={() => setPassFocus(false)}
                      />
                      <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                        <Text style={{ fontSize: 14, color: C.hint }}>{showPass ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={s.field}>
                    <Text style={s.lbl}>Confirmer le mot de passe</Text>
                    <View style={[s.inp, error && s.inpError]}>
                      <Text style={s.ico}>🔒</Text>
                      <TextInput
                        style={[s.inpTxt, { flex: 1 }]}
                        placeholder="••••••••"
                        placeholderTextColor={C.hint}
                        value={confirm}
                        onChangeText={t => { setConfirm(t); setError(''); }}
                        secureTextEntry={!showPass}
                      />
                    </View>
                    {error ? <Text style={s.fieldError}>⚠ {error}</Text> : null}
                  </View>
                  <PrimaryButton onPress={handleReset} label="Réinitialiser" loading={loading} />
                  <View style={s.signupRow}>
                    <Text style={s.signupTxt}> </Text>
                    <TouchableOpacity onPress={() => router.back()}>
                      <Text style={s.signupLink}>Retour</Text>
                    </TouchableOpacity>
                  </View>
                </AuthCard>
              )}

              {step === 'done' && (
                <AuthCard>
                  <View style={s.successBox}>
                    <Text style={s.successTitle}>Mot de passe modifié</Text>
                    <Text style={s.successTxt}>Votre mot de passe a été réinitialisé avec succès.</Text>
                    <TouchableOpacity style={s.retryBtn} onPress={() => router.push('/(tabs)')}>
                      <Text style={s.retryTxt}>Se connecter</Text>
                    </TouchableOpacity>
                  </View>
                </AuthCard>
              )}

            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: Spacing.lg },
  field: { marginBottom: Spacing.md },
  lbl: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: C.muted, marginBottom: Spacing.xs },
  inp: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: C.surface, borderRadius: Radius.md, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: Spacing.md, height: 44 },
  inpFocus: { borderColor: C.dark, backgroundColor: C.white },
  inpError: { borderColor: C.danger, backgroundColor: '#FFF8F9' },
  ico: { fontSize: 14 },
  inpTxt: { flex: 1, color: C.text, fontSize: 12, fontWeight: '500' },
  fieldError: { fontSize: 9, color: C.danger, fontWeight: '600', marginTop: 3, marginLeft: 3 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing.md },
  signupTxt: { fontSize: 10, color: C.muted },
  signupLink: { fontSize: 10, color: C.dark, fontWeight: '800' },
  successBox: { backgroundColor: '#E8FDF5', borderRadius: Radius.md, padding: Spacing.lg, borderWidth: 1, borderColor: C.success, alignItems: 'center' },
  successTitle: { fontSize: 15, fontWeight: '800', color: '#0F6E56', marginBottom: Spacing.sm },
  successTxt: { fontSize: 12, color: '#0F6E56', textAlign: 'center', lineHeight: 17, marginBottom: Spacing.lg },
  retryBtn: { backgroundColor: C.dark, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  retryTxt: { fontSize: 12, fontWeight: '700', color: C.white },
});
