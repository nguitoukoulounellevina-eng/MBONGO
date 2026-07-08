import { router } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Spacing, Radius } from '@/constants/spacing';
import { useTheme, COLOR_PRESETS } from '@/app/contexts/ThemeContext';
import { useI18n } from '@/app/contexts/I18nContext';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/app/components/ScreenWrapper';

const TOOLS: { icon: string; label: string; type: 'route' | 'alert'; route?: string; message?: string }[] = [
  { icon: '📈', label: 'Statistiques', type: 'route', route: 'stats' },
  { icon: '📚', label: 'Archives financières', type: 'route', route: 'archives' },
  { icon: '📤', label: 'Exporter les données', type: 'alert', message: 'Fonctionnalité bientôt disponible.' },
  { icon: '☁️', label: 'Sauvegarde', type: 'alert', message: 'Fonctionnalité bientôt disponible.' },
];

const MBONGO_LINKS: { icon: string; label: string; type: 'alert' | 'rate' | 'share'; message?: string }[] = [
  { icon: '📖', label: 'Guide utilisateur', type: 'alert', message: 'Fonctionnalité bientôt disponible.' },
  { icon: '❓', label: 'FAQ', type: 'alert', message: 'Fonctionnalité bientôt disponible.' },
  { icon: '📞', label: 'Support', type: 'alert', message: 'Fonctionnalité bientôt disponible.' },
  { icon: '⭐', label: "Noter l'application", type: 'rate' },
  { icon: '📤', label: 'Partager MBONGO', type: 'share' },
];

const COMING_SOON: { icon: string; label: string; desc: string }[] = [
  { icon: '📲', label: 'Synchronisation Mobile Money ⭐', desc: 'Connectez vos comptes MTN Mobile Money et Airtel Money afin de synchroniser automatiquement vos soldes et certaines transactions après votre autorisation.' },
  { icon: '🤖', label: 'IA Financière Avancée', desc: 'Analyse intelligente, recommandations personnalisées et prévisions financières.' },
  { icon: '👨‍👩‍👧', label: 'Gestion familiale', desc: 'Gérez un budget partagé avec votre famille ou votre partenaire.' },
  { icon: '☁️', label: 'Sauvegarde Cloud', desc: 'Sauvegardez automatiquement vos données et retrouvez-les sur tous vos appareils.' },
  { icon: '🌍', label: 'Multi-devises', desc: 'Gérez vos finances dans plusieurs devises avec conversion automatique.' },
  { icon: '📈', label: 'Investissements', desc: 'Suivez vos investissements et votre patrimoine directement depuis MBONGO.' },
];

export default function Plus() {
  const insets = useSafeAreaInsets();
  const { isDark, toggleMode, colors: C, primary, setPrimary } = useTheme();
  const { lang, setLang, t } = useI18n();
  const styles = React.useMemo(() => ({
    root: { ...s.root, backgroundColor: C.bg },
    header: { ...s.header },
    headerTitle: { ...s.headerTitle, color: C.dark },
    headerSub: { ...s.headerSub, color: C.muted },
    sectionWrap: { ...s.sectionWrap },
    sectionTitle: { ...s.sectionTitle, color: C.dark },
    card: { ...s.card, backgroundColor: C.white, borderColor: C.border, shadowColor: C.dark },
    row: { ...s.row },
    rowBorder: { ...s.rowBorder, borderBottomColor: C.border },
    rowIcon: { ...s.rowIcon },
    rowLabel: { ...s.rowLabel, color: C.text },
    rowArrow: { ...s.rowArrow },
    rowArrowTxt: { ...s.rowArrowTxt, color: C.hint },
    visionCard: { ...s.visionCard, backgroundColor: C.white, borderColor: C.border, shadowColor: C.dark },
    visionAccent: { ...s.visionAccent, backgroundColor: C.purple },
    visionContent: { ...s.visionContent },
    visionHeaderRow: { ...s.visionHeaderRow },
    visionBadge: { ...s.visionBadge },
    visionBadgeTxt: { ...s.visionBadgeTxt },
    visionTitle: { ...s.visionTitle, color: C.dark },
    visionText: { ...s.visionText, color: C.muted },
    aboutCard: { ...s.aboutCard, backgroundColor: C.white, borderColor: C.border, shadowColor: C.dark },
    aboutHeader: { ...s.aboutHeader },
    aboutLogo: { ...s.aboutLogo, backgroundColor: C.purple },
    aboutLogoText: { ...s.aboutLogoText, color: C.white },
    aboutHeaderText: { ...s.aboutHeaderText },
    aboutAppName: { ...s.aboutAppName, color: C.dark },
    aboutVersion: { ...s.aboutVersion, color: C.muted },
    aboutDesc: { ...s.aboutDesc, color: C.muted },
    aboutDivider: { ...s.aboutDivider, backgroundColor: C.border },
    aboutCredits: { ...s.aboutCredits },
    aboutCreditsLabel: { ...s.aboutCreditsLabel, color: C.hint },
    aboutCreditsNames: { ...s.aboutCreditsNames, color: C.text },
    comingCard: { ...s.comingCard, backgroundColor: C.white, borderColor: C.border },
    comingLeft: { ...s.comingLeft },
    comingIconWrap: { ...s.comingIconWrap, backgroundColor: C.surface },
    comingIcon: { ...s.comingIcon },
    comingCenter: { ...s.comingCenter },
    comingLabel: { ...s.comingLabel, color: C.dark },
    comingDesc: { ...s.comingDesc, color: C.muted },
    comingBadge: { ...s.comingBadge, backgroundColor: C.purple },
    comingBadgeTxt: { ...s.comingBadgeTxt, color: C.white },
    langTxt: { ...s.langTxt },
    langTxtActive: { ...s.langTxtActive },
  }), [C]);

  const handleNotAvailable = (msg: string) => Alert.alert('Information', msg);

  const handleRate = () => {
    Linking.openURL('market://details?id=com.mbongo.app').catch(() =>
      Linking.openURL('https://play.google.com/store/apps/details?id=com.mbongo.app')
    );
  };

  const handleShare = () => {
    Share.share({ message: 'Découvrez MBONGO, votre assistant financier intelligent !', title: 'MBONGO' });
  };

  return (
    <ScreenWrapper style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
        {/* ── Header ─────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('tabs.plus')}</Text>
          <Text style={styles.headerSub}>{t('plus.visionText')}</Text>
        </View>

        {/* ── Personnalisation ────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>{t('plus.personalization')}</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowIcon}>🌙</Text>
              <Text style={[styles.rowLabel, { flex: 1 }]}>{t('plus.darkMode')}</Text>
              <Switch
                value={isDark}
                onValueChange={toggleMode}
                trackColor={{ false: C.hint, true: C.purpleL }}
                thumbColor={isDark ? C.purple : C.white}
              />
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowIcon}>🌐</Text>
              <Text style={styles.rowLabel}>{t('plus.language')}</Text>
              <Pressable onPress={() => setLang(lang === 'fr' ? 'en' : 'fr')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.langTxt, lang === 'fr' && styles.langTxtActive, { color: lang === 'fr' ? C.purple : C.muted }]}>FR</Text>
                <Text style={{ fontSize: 12, color: C.muted }}>/</Text>
                <Text style={[styles.langTxt, lang === 'en' && styles.langTxtActive, { color: lang === 'en' ? C.purple : C.muted }]}>EN</Text>
              </Pressable>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowIcon}>🎨</Text>
              <Text style={styles.rowLabel}>{t('plus.themeColor')}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {COLOR_PRESETS.map((p) => (
                  <Pressable
                    key={p.key}
                    onPress={() => setPrimary(p.main)}
                    style={[
                      { width: 24, height: 24, borderRadius: 12, backgroundColor: p.main, alignItems: 'center', justifyContent: 'center' },
                      primary === p.main && { borderWidth: 2, borderColor: C.dark },
                    ]}
                  >
                    {primary === p.main && <Text style={{ fontSize: 11, color: '#fff', fontWeight: '800' }}>✓</Text>}
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ── Analyse et outils ──────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>{t('plus.tools')}</Text>
          <View style={styles.card}>
            {TOOLS.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.row, i < TOOLS.length - 1 && styles.rowBorder]}
                onPress={() => {
                  if (item.type === 'route' && item.route) router.push(`/${item.route}` as any);
                  else if (item.type === 'alert') handleNotAvailable(item.message || '');
                }}
                activeOpacity={0.6}
              >
                <Text style={styles.rowIcon}>{item.icon}</Text>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <View style={styles.rowArrow}>
                  <Ionicons name="chevron-forward" size={16} color={C.hint} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── MBONGO ─────────────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>{t('plus.mbongo')}</Text>
          <View style={styles.card}>
            {MBONGO_LINKS.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.row, i < MBONGO_LINKS.length - 1 && styles.rowBorder]}
                onPress={() => {
                  if (item.type === 'rate') handleRate();
                  else if (item.type === 'share') handleShare();
                  else if (item.type === 'alert') handleNotAvailable(item.message || '');
                }}
                activeOpacity={0.6}
              >
                <Text style={styles.rowIcon}>{item.icon}</Text>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <View style={styles.rowArrow}>
                  <Ionicons name="chevron-forward" size={16} color={C.hint} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── À propos ────────────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>{t('plus.about')}</Text>
          <View style={styles.aboutCard}>
            <View style={styles.aboutHeader}>
              <View style={styles.aboutLogo}>
                <Text style={styles.aboutLogoText}>MB</Text>
              </View>
              <View style={styles.aboutHeaderText}>
                <Text style={styles.aboutAppName}>MBONGO</Text>
                <Text style={styles.aboutVersion}>Version 1.0.0</Text>
              </View>
            </View>
            <Text style={styles.aboutDesc}>
              MBONGO est votre assistant financier intelligent conçu pour vous aider à gérer vos finances personnelles avec simplicité et efficacité. Suivez vos revenus, dépenses, budgets et bien plus encore.
            </Text>
            <View style={styles.aboutDivider} />
            <View style={styles.aboutCredits}>
              <Text style={styles.aboutCreditsLabel}>Conçue et développée par</Text>
              <Text style={styles.aboutCreditsNames}>NGUITOUKOULOU-LOUFOUKOU Nelle-Vina</Text>
              <Text style={styles.aboutCreditsNames}>MBE Précieuse Herneige de Stiane</Text>
            </View>
          </View>
        </View>

        {/* ── Notre vision ───────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>{t('plus.vision')}</Text>
          <View style={styles.visionCard}>
            <View style={styles.visionAccent} />
            <View style={styles.visionContent}>
              <View style={styles.visionHeaderRow}>
                <View style={styles.visionBadge}>
                  <Text style={styles.visionBadgeTxt}>🚀</Text>
                </View>
                <Text style={styles.visionTitle}>L'avenir de MBONGO</Text>
              </View>
              <Text style={styles.visionText}>
                MBONGO évolue continuellement pour devenir votre assistant financier personnel. Découvrez les prochaines fonctionnalités que nous préparons.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Prochainement ──────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>{t('plus.comingSoon')}</Text>
          {COMING_SOON.map((item) => (
            <View key={item.label} style={styles.comingCard}>
              <View style={styles.comingLeft}>
                <View style={styles.comingIconWrap}>
                  <Text style={styles.comingIcon}>{item.icon}</Text>
                </View>
              </View>
              <View style={styles.comingCenter}>
                <Text style={styles.comingLabel}>{item.label}</Text>
                <Text style={styles.comingDesc}>{item.desc}</Text>
              </View>
              <View style={styles.comingBadge}>
                <Text style={styles.comingBadgeTxt}>Bientôt</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, marginTop: Spacing.xs, lineHeight: 18 },
  sectionWrap: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md },
  card: { borderRadius: Radius.lg, borderWidth: 1, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: Spacing.sm, elevation: 2, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, minHeight: 48 },
  rowBorder: { borderBottomWidth: 1 },
  rowIcon: { fontSize: 20, width: 32, textAlign: 'center' },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '600', marginLeft: Spacing.md },
  rowArrow: { width: 24, alignItems: 'flex-end' },
  rowArrowTxt: { fontSize: 14, fontWeight: '600' },
  visionCard: { flexDirection: 'row', borderRadius: Radius.lg, borderWidth: 1, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: Spacing.sm, elevation: 2, overflow: 'hidden' },
  visionAccent: { width: 4 },
  visionContent: { flex: 1, padding: Spacing.lg },
  visionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    visionBadge: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  visionBadgeTxt: { fontSize: 14 },
  visionTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
  visionText: { fontSize: 12, lineHeight: 18 },
  aboutCard: { borderRadius: Radius.lg, borderWidth: 1, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: Spacing.sm, elevation: 2, overflow: 'hidden', padding: Spacing.lg },
  aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  aboutLogo: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  aboutLogoText: { fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },
  aboutHeaderText: { flex: 1 },
  aboutAppName: { fontSize: 16, fontWeight: '800' },
  aboutVersion: { fontSize: 11, marginTop: 1 },
  aboutDesc: { fontSize: 12, lineHeight: 18 },
  aboutDivider: { height: 1, marginVertical: Spacing.md },
  aboutCredits: { gap: 2 },
  aboutCreditsLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
  aboutCreditsNames: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  comingCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1, opacity: 0.85 },
  comingLeft: { marginRight: Spacing.md },
  comingIconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  comingIcon: { fontSize: 20 },
  comingCenter: { flex: 1 },
  comingLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  comingDesc: { fontSize: 11, lineHeight: 16 },
  comingBadge: { borderRadius: Radius.sm, paddingVertical: 3, paddingHorizontal: Spacing.sm, marginLeft: Spacing.sm, marginTop: 2 },
  comingBadgeTxt: { fontSize: 10, fontWeight: '700' },
  langTxt: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 6, paddingVertical: 2 },
  langTxtActive: { fontWeight: '900' },
});
