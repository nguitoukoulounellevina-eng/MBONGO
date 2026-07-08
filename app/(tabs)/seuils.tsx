import { router } from 'expo-router';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/spacing';
import { Fonts } from '@/constants/theme';
import { fmt } from '@/app/utils/format';
import { PageHeader } from '@/app/components/PageHeader';
import api from '@/app/services/api';
import { useTheme } from '@/app/contexts/ThemeContext';


const ACCENT = '#F59E0B';

interface SeuilItem {
  id: number;
  categorie_id: number;
  categorie_libelle: string;
  categorie_icone: string;
  montant_seuil: number;
  total_actuel: number;
  pourcentage: number;
  depasse: boolean;
  type: string;
}

interface CategorieOption {
  id: number;
  libelle: string;
  icone: string;
}

export default function Seuils() {
  const { colors: C } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listPad: { padding: Spacing.lg, paddingBottom: 40 },

    addBtn: {
      width: 36, height: 36, borderRadius: Radius.full,
      backgroundColor: 'rgba(255,255,255,0.10)',
      alignItems: 'center', justifyContent: 'center',
    },

    card: {
      backgroundColor: C.white, borderRadius: Radius.md,
      padding: Spacing.md, borderWidth: 1, borderColor: C.border,
      marginBottom: Spacing.sm,
      shadowColor: C.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
      position: 'relative',
    },
    deleteBtn: {
      position: 'absolute', top: 8, right: 8, zIndex: 1,
      width: 28, height: 28, borderRadius: Radius.full,
      backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
    cardEtat: { fontSize: 14, marginRight: Spacing.sm },
    cardIcon: { fontSize: 17, marginRight: Spacing.sm },
    cardTitle: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1, fontFamily: Fonts.rounded },
    cardRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.xs },
    cardAmount: { fontSize: 15, fontWeight: '800' },
    cardSep: { fontSize: 13, color: C.muted, marginHorizontal: 4 },
    cardAmountMuted: { fontSize: 13, fontWeight: '600', color: C.muted },
    barOuter: { height: 4, backgroundColor: C.surface, borderRadius: 2, overflow: 'hidden', marginBottom: Spacing.xs },
    barFill: { height: 4, borderRadius: 2 },
    pctText: { fontSize: 11, fontWeight: '700', fontFamily: Fonts.rounded },
    depassText: { fontSize: 11, fontWeight: '700', color: C.danger, marginTop: 2, fontFamily: Fonts.rounded },

    emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: Spacing.xl },
    emptyIco: { fontSize: 48, marginBottom: Spacing.md },
    emptyTxt: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: Spacing.sm, fontFamily: Fonts.rounded },
    emptySub: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19, marginBottom: Spacing.lg, fontFamily: Fonts.rounded },
    emptyBtn: { backgroundColor: ACCENT, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
    emptyBtnText: { fontSize: 14, fontWeight: '700', color: C.white, fontFamily: Fonts.rounded },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
    modalCard: { backgroundColor: C.white, borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', maxWidth: 400 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: Spacing.lg, fontFamily: Fonts.rounded },
    label: { fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: Spacing.sm, textTransform: 'uppercase', fontFamily: Fonts.rounded },
    catList: { marginBottom: Spacing.lg },
    catItem: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
      borderRadius: Radius.md, marginBottom: Spacing.xs,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    },
    catItemSelected: { borderColor: ACCENT, backgroundColor: '#FFFBEB' },
    catIco: { fontSize: 16 },
    catLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text, fontFamily: Fonts.rounded },
    catLabelSelected: { color: ACCENT },
    noCat: { fontSize: 13, color: C.muted, fontStyle: 'italic', fontFamily: Fonts.rounded },
    input: {
      backgroundColor: C.surface, borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      fontSize: 15, fontWeight: '600', color: C.text, fontFamily: Fonts.rounded,
      borderWidth: 1.5, borderColor: C.border, marginBottom: Spacing.lg,
    },
    modalActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
    cancelBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
    cancelText: { fontSize: 14, fontWeight: '600', color: C.muted, fontFamily: Fonts.rounded },
    saveBtn: { backgroundColor: ACCENT, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, minWidth: 100, alignItems: 'center' },
    saveBtnDisabled: { opacity: 0.5 },
    saveText: { fontSize: 14, fontWeight: '700', color: C.white, fontFamily: Fonts.rounded },
  }), [C]);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [seuils, setSeuils] = useState<SeuilItem[]>([]);
  const [categories, setCategories] = useState<CategorieOption[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSeuilCategorie, setNewSeuilCategorie] = useState<number | null>(null);
  const [newSeuilMontant, setNewSeuilMontant] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resultats, cats] = await Promise.all([
        api.seuils.check(),
        api.categories.list().catch(() => []),
      ]);
      setSeuils(Array.isArray(resultats) ? resultats : []);
      setCategories(Array.isArray(cats) ? cats.filter((c: any) => c.type === 'depense') : []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newSeuilCategorie || !newSeuilMontant.trim()) return;
    setSaving(true);
    try {
      await api.seuils.create({
        categorie_id: newSeuilCategorie,
        montant_seuil: parseFloat(newSeuilMontant),
      });
      setModalVisible(false);
      setNewSeuilCategorie(null);
      setNewSeuilMontant('');
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de créer le seuil.');
    }
    setSaving(false);
  };

  const handleDelete = (id: number) => {
    const confirm = Platform.OS === 'web' ? window.confirm('Supprimer ce seuil ?') : true;
    if (!confirm) return;
    (async () => {
      try {
        await api.seuils.remove(id);
        load();
      } catch { /* */ }
    })();
  };

  const renderSeuil = ({ item }: { item: SeuilItem }) => {
    const color = item.depasse ? C.danger : item.pourcentage >= 80 ? C.warning : C.green;
    const iconeEtat = item.depasse ? '🔴' : item.pourcentage >= 80 ? '🟡' : '🟢';
    const iconeCateg = item.categorie_icone || '📦';
    return (
      <View style={s.card}>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={s.deleteBtn} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={16} color={C.muted} />
        </TouchableOpacity>
        <View style={s.cardTop}>
          <Text style={s.cardEtat}>{iconeEtat}</Text>
          <Text style={s.cardIcon}>{iconeCateg}</Text>
          <Text style={s.cardTitle}>{item.categorie_libelle || 'Catégorie'}</Text>
        </View>
        <View style={s.cardRow}>
          <Text style={[s.cardAmount, { color }]}>{fmt(item.total_actuel)}</Text>
          <Text style={s.cardSep}>/</Text>
          <Text style={s.cardAmountMuted}>{fmt(item.montant_seuil)}</Text>
        </View>
        <View style={s.barOuter}>
          <View style={[s.barFill, { width: `${Math.min(item.pourcentage, 100)}%`, backgroundColor: color }]} />
        </View>
        <Text style={[s.pctText, { color }]}>{item.pourcentage}% utilisé</Text>
        {item.depasse && (
          <Text style={s.depassText}>Dépassé de {fmt(item.total_actuel - item.montant_seuil)} F</Text>
        )}
      </View>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <PageHeader
        title="Seuils de dépenses"
        subtitle="Surveillez vos limites par catégorie"
        color={C.dark}
        right={
          <TouchableOpacity onPress={() => setModalVisible(true)} style={s.addBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={22} color={C.white} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <FlatList
          data={seuils}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.listPad}
          renderItem={renderSeuil}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIco}>🚦</Text>
              <Text style={s.emptyTxt}>Aucun seuil défini</Text>
              <Text style={s.emptySub}>Créez un seuil pour surveiller vos dépenses par catégorie</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
                <Text style={s.emptyBtnText}>➕ Créer un seuil</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Nouveau seuil</Text>

            <Text style={s.label}>Catégorie</Text>
            <View style={s.catList}>
              {categories.map(cat => {
                const selected = newSeuilCategorie === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.catItem, selected && s.catItemSelected]}
                    onPress={() => setNewSeuilCategorie(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.catIco}>{cat.icone || '📦'}</Text>
                    <Text style={[s.catLabel, selected && s.catLabelSelected]}>{cat.libelle}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
                  </TouchableOpacity>
                );
              })}
              {categories.length === 0 && (
                <Text style={s.noCat}>Aucune catégorie de dépense disponible.</Text>
              )}
            </View>

            <Text style={s.label}>Montant seuil (FCFA)</Text>
            <TextInput
              style={s.input}
              placeholder="Ex: 50000"
              placeholderTextColor={C.hint}
              keyboardType="numeric"
              value={newSeuilMontant}
              onChangeText={setNewSeuilMontant}
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <Text style={s.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, (!newSeuilCategorie || !newSeuilMontant.trim()) && s.saveBtnDisabled]}
                onPress={handleCreate}
                disabled={!newSeuilCategorie || !newSeuilMontant.trim() || saving}
                activeOpacity={0.8}
              >
                {saving ? <ActivityIndicator size="small" color={C.white} /> : <Text style={s.saveText}>Créer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


