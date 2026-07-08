import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '@/app/services/api';
import { Spacing, Radius } from '@/constants/spacing';
import { fmt } from '@/app/utils/format';
import { useTheme } from '@/app/contexts/ThemeContext';
import PeriodSelector from '@/app/components/PeriodSelector';
import { usePeriod } from '@/app/services/periodService';
import { ScreenWrapper, FAB_BOTTOM } from '@/app/components/ScreenWrapper';

export default function Transactions() {
  const insets = useSafeAreaInsets();
  const { colors: C, isDark } = useTheme();
  const period = usePeriod();

  const styles = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: isDark ? C.bg : C.dark, alignItems: 'center', position: 'relative', overflow: 'hidden' },
    ring1: { position:'absolute', width:180, height:180, borderRadius:90, borderWidth:1, borderColor:'rgba(167,139,250,0.12)', top:-50, right:-30 },
    ring2: { position:'absolute', width:100, height:100, borderRadius:50, borderWidth:1, borderColor:'rgba(167,139,250,0.06)', top:10, right:16 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.xs },
    searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.md, backgroundColor: C.white, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: Spacing.md, height: 42 },
    searchIcon: { marginRight: Spacing.sm },
    searchInput: { flex: 1, fontSize: 13, color: C.dark, paddingVertical: 0 },
    monthCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.md, backgroundColor: C.white, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, padding: Spacing.md, gap: Spacing.md },
    monthCardIcon: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: C.surfaceLight, alignItems: 'center', justifyContent: 'center' },
    monthCardContent: { flex: 1 },
    monthCardTitle: { fontSize: 13, fontWeight: '700', color: C.dark },
    monthCardCount: { fontSize: 11, color: C.muted, marginTop: 1 },
    body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, marginTop: Spacing.md },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: C.dark, textTransform: 'uppercase', letterSpacing: 0.8 },
    seeAll: { fontSize: 11, fontWeight: '700', color: C.purple },
    emptyBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm, backgroundColor: C.white, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.lg },
    emptyTxt: { fontSize: 13, color: C.muted, fontWeight: '600' },
    item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: C.white, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.sm },
    itemDot: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    itemEmoji: { fontSize: 18 },
    itemInfo: { flex: 1 },
    itemLbl: { fontSize: 13, fontWeight: '700', color: C.dark },
    itemCat: { fontSize: 10, color: C.muted, marginTop: 1 },
    itemRight: { alignItems: 'flex-end' },
    itemDate: { fontSize: 9, color: C.muted, marginBottom: 2 },
    itemMt: { fontSize: 13, fontWeight: '800' },
    fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center', shadowColor: C.purple, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, paddingTop: Spacing.md },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: Spacing.lg },
    sheetTitle: { fontSize: 17, fontWeight: '800', color: C.dark, marginBottom: Spacing.lg, textAlign: 'center' },
    sheetItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
    sheetIco: { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    sheetItemInfo: { flex: 1 },
    sheetItemLbl: { fontSize: 14, fontWeight: '700', color: C.dark },
    sheetItemDesc: { fontSize: 11, color: C.muted, marginTop: 1 },
    sheetCancel: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm },
    sheetCancelTxt: { fontSize: 13, fontWeight: '700', color: C.muted },
  }), [C]);

  const [loading, setLoading] = useState(true);
  const [allRevenus, setAllRevenus] = useState<any[]>([]);
  const [allDepenses, setAllDepenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFab, setShowFab] = useState(false);

  const catsMap: Record<number, any> = {};
  categories.forEach((c: any) => { catsMap[c.id] = c; });

  const totalMonthOps = allDepenses.length + allRevenus.length;

  const loadData = useCallback(async () => {
    try {
      const [r, d, c] = await Promise.all([
        api.revenus.list({ debut: period.current.debut, fin: period.current.fin }),
        api.depenses.list({ debut: period.current.debut, fin: period.current.fin }),
        api.categories.list(),
      ]);
      setAllRevenus(Array.isArray(r) ? r : []);
      setAllDepenses(Array.isArray(d) ? d : []);
      setCategories(Array.isArray(c) ? c : []);
    } catch (err) {
      console.warn('load transactions', err);
    }
    setLoading(false);
  }, [period.current.debut, period.current.fin, period.current.id]);

  useFocusEffect(useCallback(() => {
    loadData();
    period.loadAvailablePeriods();
  }, [loadData]));

  const matchesSearch = (item: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const libelle = (item.libelle || item.categorie_libelle || '').toLowerCase();
    const montant = String(item.montant || item.mt || '');
    return libelle.includes(q) || montant.includes(q);
  };

  const sortByDate = (a: any, b: any) =>
    new Date(b.date || b.date_depense || b.date_revenu || b.created_at).getTime() -
    new Date(a.date || a.date_depense || a.date_revenu || a.created_at).getTime();

  const displayedDepenses = allDepenses
    .filter(matchesSearch)
    .sort(sortByDate)
    .slice(0, 3);

  const displayedRevenus = allRevenus
    .filter(matchesSearch)
    .sort(sortByDate)
    .slice(0, 3);

  if (loading) {
    return (
      <ScreenWrapper style={styles.root}>
        <StatusBar style="dark" />
        <View style={{ paddingTop: insets.top, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.purple} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={styles.root}>
      <StatusBar style="light" />

      <View style={{ flex: 1 }}>
        {/* ── Header ─────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <View style={styles.ring1} />
          <View style={styles.ring2} />
          <Text style={styles.headerTitle}>Transactions</Text>
          <Text style={styles.headerSub}>Gérez et suivez toutes vos opérations</Text>
        </View>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Sélecteur de période ─────────── */}
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs }}>
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

        {/* ── Carte info période ────────────── */}
        <View style={styles.monthCard}>
          <View style={styles.monthCardIcon}>
            <Ionicons name="calendar-outline" size={16} color={C.purple} />
          </View>
          <View style={styles.monthCardContent}>
            <Text style={styles.monthCardTitle}>{period.label}</Text>
            <Text style={styles.monthCardCount}>
              {totalMonthOps} opération{totalMonthOps > 1 ? 's' : ''} enregistrée{totalMonthOps > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* ── Dépenses récentes ─────────────── */}
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Dépenses</Text>
              <TouchableOpacity onPress={() => router.push('/depenses')} activeOpacity={0.7} style={{flexDirection:'row', alignItems:'center'}}>
                <Text style={styles.seeAll}>Voir tout </Text>
                <Ionicons name="chevron-forward" size={12} color={C.purple} />
              </TouchableOpacity>
            </View>
            {displayedDepenses.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="card-outline" size={28} color={C.muted} />
                <Text style={styles.emptyTxt}>
                  {searchQuery ? 'Aucune dépense trouvée' : 'Aucune dépense'}
                </Text>
              </View>
            ) : (
              displayedDepenses.map((d, i) => {
                const cat = catsMap[d.categorie_id];
                return (
                  <TouchableOpacity key={d.id || `d-${i}`} style={styles.item} onPress={() => router.push('/depenses')} activeOpacity={0.7}>
                    <View style={[styles.itemDot, { backgroundColor: cat?.couleur || 'rgba(244,63,94,0.15)' }]}>
                      <Text style={styles.itemEmoji}>{cat?.icone || cat?.emoji || '💸'}</Text>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemLbl} numberOfLines={1}>{d.libelle || d.categorie_libelle || 'Sans libellé'}</Text>
                      <Text style={styles.itemCat}>{cat?.libelle || cat?.nom || d.categorie_libelle || ''}</Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.itemDate}>
                        {d.date || d.date_depense ? new Date(d.date || d.date_depense).toLocaleDateString('fr-FR') : ''}
                      </Text>
                      <Text style={[styles.itemMt, { color: C.danger }]}>-{fmt(d.montant || d.mt || 0)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>

          {/* ── Revenus récents ────────────────── */}
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Revenus</Text>
              <TouchableOpacity onPress={() => router.push('/revenus')} activeOpacity={0.7} style={{flexDirection:'row', alignItems:'center'}}>
                <Text style={styles.seeAll}>Voir tout </Text>
                <Ionicons name="chevron-forward" size={12} color={C.purple} />
              </TouchableOpacity>
            </View>
            {displayedRevenus.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="wallet-outline" size={28} color={C.muted} />
                <Text style={styles.emptyTxt}>
                  {searchQuery ? 'Aucun revenu trouvé' : 'Aucun revenu'}
                </Text>
              </View>
            ) : (
              displayedRevenus.map((r, i) => {
                const cat = catsMap[r.categorie_id];
                return (
                  <TouchableOpacity key={r.id || `r-${i}`} style={styles.item} onPress={() => router.push('/revenus')} activeOpacity={0.7}>
                    <View style={[styles.itemDot, { backgroundColor: cat?.couleur || 'rgba(34,197,94,0.15)' }]}>
                      <Text style={styles.itemEmoji}>{cat?.icone || cat?.emoji || '💰'}</Text>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemLbl} numberOfLines={1}>{r.libelle || r.categorie_libelle || 'Sans libellé'}</Text>
                      <Text style={styles.itemCat}>{cat?.libelle || cat?.nom || r.categorie_libelle || ''}</Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.itemDate}>
                        {r.date || r.date_revenu ? new Date(r.date || r.date_revenu).toLocaleDateString('fr-FR') : ''}
                      </Text>
                      <Text style={[styles.itemMt, { color: C.green }]}>+{fmt(r.montant || r.mt || 0)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        </View>
      </ScrollView>
      </View>

      {/* ── FAB ─────────────────────────────── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: FAB_BOTTOM }]}
        onPress={() => setShowFab(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={C.white} />
      </TouchableOpacity>

      {/* ── Bottom Sheet ────────────────────── */}
      <Modal visible={showFab} transparent animationType="fade" onRequestClose={() => setShowFab(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowFab(false)}>
          <Pressable style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Nouvelle opération</Text>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => { setShowFab(false); router.push('/depenses?add=true'); }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetIco, { backgroundColor: 'rgba(244,63,94,0.15)' }]}>
                <Ionicons name="arrow-down-outline" size={20} color={C.danger} />
              </View>
              <View style={styles.sheetItemInfo}>
                <Text style={styles.sheetItemLbl}>Ajouter une dépense</Text>
                <Text style={styles.sheetItemDesc}>Enregistrer une nouvelle sortie d'argent</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => { setShowFab(false); router.push('/revenus?add=true'); }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetIco, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                <Ionicons name="arrow-up-outline" size={20} color={C.green} />
              </View>
              <View style={styles.sheetItemInfo}>
                <Text style={styles.sheetItemLbl}>Ajouter un revenu</Text>
                <Text style={styles.sheetItemDesc}>Enregistrer une nouvelle entrée d'argent</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setShowFab(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelTxt}>Annuler</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}


