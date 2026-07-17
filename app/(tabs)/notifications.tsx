import { router } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Spacing, Radius } from '@/constants/spacing';
import api from '@/app/services/api';
import { PageHeader } from '@/app/components/PageHeader';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useNotifications } from '@/app/services/NotificationContext';


const TYPE_COLORS: Record<string, string> = { danger:'#F43F5E', warning:'#F59E0B', success:'#22C55E', info:'#3B82F6' };
const ROUTE_MAP: Record<string, string> = { budget:'budget', depenses:'depenses', objectifs_epargne:'objectifs_epargne', revenus:'revenus' };

interface NotificationItem {
  id: number;
  type: string;
  titre: string;
  message: string;
  est_lue: number;
  created_at: string;
}

const groupByPeriod = (items: NotificationItem[]) => {
  const today: NotificationItem[] = [];
  const week: NotificationItem[] = [];
  const older: NotificationItem[] = [];
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - startWeek.getDay());

  for (const item of items) {
    const d = new Date(item.created_at);
    if (d >= startToday) today.push(item);
    else if (d >= startWeek) week.push(item);
    else older.push(item);
  }
  return { today, week, older };
};

function NotificationCard({ item, onMark, onDelete }: { item: NotificationItem; onMark: (id: number) => void; onDelete: (id: number) => void }) {
  const { colors: C } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const cs = useMemo(() => StyleSheet.create({
    card: { backgroundColor: C.white, borderRadius: Radius.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: C.border },
    cardUnread: { borderLeftWidth: 3, borderLeftColor: C.warning },
    rowWrap: { flexDirection: 'row', alignItems: 'center' },
    cardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.md },
    cardContent: { flex: 1 },
    cardTitre: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
    cardTitreUnread: { fontWeight: '800' },
    cardMessage: { fontSize: 12, color: C.muted, lineHeight: 16 },
    cardDate: { fontSize: 10, color: C.hint, marginTop: 4 },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.warning },
    trashBtn: { padding: 12, marginRight: 4, justifyContent: 'center' },
    trashIco: { fontSize: 20, opacity: 0.6 },
    seeMore: { fontSize: 11, fontWeight: '700', color: C.warning, marginTop: 2 },
    hiddenMeasure: { position: 'absolute', opacity: 0, left: 0, right: 0 },
  }), [C]);
  const cardAnim = useSharedValue(0);
  useEffect(() => {
    cardAnim.value = withSpring(1, { damping: 16, stiffness: 130 });
  }, []);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardAnim.value,
    transform: [{ translateX: (1 - cardAnim.value) * 30 }],
  }));
  const color = TYPE_COLORS[item.type] || C.muted;
  const route = ROUTE_MAP[item.type] || null;
  const LINE_HEIGHT = 16;
  const MAX_LINES = 2;
  const isTruncated = measuredHeight !== null && measuredHeight > LINE_HEIGHT * MAX_LINES;
  return (
    <Animated.View style={[cs.card, !item.est_lue && cs.cardUnread, cardStyle]}>
      <View style={cs.rowWrap}>
        <TouchableOpacity
          style={cs.cardInner}
          activeOpacity={0.8}
          onPress={() => { onMark(item.id); if (route) router.push(`/${route}` as any); }}
        >
          <View style={[cs.dot, { backgroundColor: color }]} />
          <View style={cs.cardContent}>
            <Text style={[cs.cardTitre, !item.est_lue && cs.cardTitreUnread]}>{item.titre}</Text>
            <Text
              style={cs.cardMessage}
              numberOfLines={expanded ? undefined : 2}
            >
              {item.message}
            </Text>
            {!expanded && (
              <Text
                style={[cs.cardMessage, cs.hiddenMeasure]}
                onLayout={(e) => setMeasuredHeight(e.nativeEvent.layout.height)}
              >
                {item.message}
              </Text>
            )}
            {isTruncated && (
              <TouchableOpacity onPress={() => setExpanded(!expanded)} hitSlop={4}>
                <Text style={cs.seeMore}>{expanded ? 'Voir moins' : 'Voir plus'}</Text>
              </TouchableOpacity>
            )}
            <Text style={cs.cardDate}>
              {new Date(item.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
            </Text>
          </View>
          {!item.est_lue && <View style={cs.unreadDot} />}
        </TouchableOpacity>
        <TouchableOpacity style={cs.trashBtn} onPress={() => onDelete(item.id)}>
          <Text style={cs.trashIco}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function Notifications() {
  const { colors: C } = useTheme();
  const { lastNotification, clearLastNotification, marquerLue: ctxMarquerLue, toutLire: ctxToutLire } = useNotifications();
  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    markAllBtn: { paddingHorizontal: Spacing.sm },
    markAllTxt: { fontSize: 13, fontWeight: '700', color: C.warning },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingTxt: { marginTop: Spacing.md, fontSize: 14, color: C.muted },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
    emptyIco: { fontSize: 49, marginBottom: Spacing.md },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: Spacing.xs },
    emptyTxt: { fontSize: 13, color: C.muted, textAlign: 'center' },
    listWrap: { flex: 1 },
    section: { marginBottom: Spacing.lg },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md },

  }), [C]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const entry = useSharedValue(0);

  useEffect(() => {
    entry.value = withSpring(1, { damping: 14, stiffness: 100 });
    load();
  }, []);

  useEffect(() => {
    if (lastNotification) {
      setNotifications(prev => {
        if (prev.some(n => n.id === lastNotification.id)) return prev;
        return [lastNotification, ...prev];
      });
      clearLastNotification();
    }
  }, [lastNotification]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.notifications.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch { setNotifications([]); }
    setLoading(false);
  };

  const marquerLue = async (id: number) => {
    await ctxMarquerLue(id);
    setNotifications(prev => prev.map(a => a.id === id ? { ...a, est_lue: 1 } : a));
  };

  const toutLire = async () => {
    await ctxToutLire();
    setNotifications(prev => prev.map(a => ({ ...a, est_lue: 1 })));
  };

  const supprimer = (id: number) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) {
        api.notifications.remove(id).then(() => {
          setNotifications(prev => prev.filter(a => a.id !== id));
        }).catch(() => {});
      }
    } else {
      Alert.alert(
        'Supprimer',
        'Êtes-vous sûr de vouloir supprimer cette notification ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.notifications.remove(id);
                setNotifications(prev => prev.filter(a => a.id !== id));
              } catch { /* ignore */ }
            },
          },
        ]
      );
    }
  };

  const grouped = groupByPeriod(notifications);
  const unreadCount = notifications.filter(a => !a.est_lue).length;

  const animStyle = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [{ translateY: (1 - entry.value) * 20 }],
  }));

  const sections = [
    { title: "Aujourd'hui", data: grouped.today },
    { title: 'Cette semaine', data: grouped.week },
    { title: 'Plus tôt', data: grouped.older },
  ].filter(s => s.data.length > 0);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <PageHeader
        title="Centre de notifications"
        icon="🔔"
        color={C.dark}
        right={
          unreadCount > 0 && (
            <TouchableOpacity onPress={toutLire} style={s.markAllBtn}>
              <Text style={s.markAllTxt}>Tout lu</Text>
            </TouchableOpacity>
          )
        }
      />

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#D97706" />
          <Text style={s.loadingTxt}>Chargement...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyIco}>🔔</Text>
          <Text style={s.emptyTitle}>Aucune notification</Text>
          <Text style={s.emptyTxt}>Les alertes financières apparaîtront ici.</Text>
        </View>
      ) : (
        <Animated.View style={[s.listWrap, animStyle]}>
          <FlatList
            data={sections}
            keyExtractor={s => s.title}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
            renderItem={({ item: section }) => (
              <View style={s.section}>
                <Text style={s.sectionTitle}>{section.title}</Text>
                {section.data.map((a) => (
                  <NotificationCard key={a.id} item={a} onMark={marquerLue} onDelete={supprimer} />
                ))}
              </View>
            )}
          />
        </Animated.View>
      )}
    </View>
  );
}





