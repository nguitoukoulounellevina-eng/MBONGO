import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from './constants';
import { Spacing, Radius } from '@/constants/spacing';

interface HeroHeaderProps {
  title: string;
  accentText: string;
  subtitle: string;
  badgeText?: string;
  showMetrics?: boolean;
  children?: React.ReactNode;
}

export default function HeroHeader({
  title,
  accentText,
  subtitle,
  badgeText = 'En ligne',
  showMetrics = true,
  children,
}: HeroHeaderProps) {
  return (
    <View style={s.card}>
      <View style={s.ring1} />
      <View style={s.ring2} />
      <View style={s.ring3} />
      <View style={s.topRow}>
        <View style={s.logoRow}>
          <View style={s.logoMark}><Text style={s.logoIcon}>⚡</Text></View>
          <View>
            <Text style={s.logoName}>MBONGO</Text>
            <Text style={s.logoVersion}>v2.0 · Production</Text>
          </View>
        </View>
        <View style={s.badge}>
          <View style={s.badgeDot} />
          <Text style={s.badgeTxt}>{badgeText}</Text>
        </View>
      </View>
      <Text style={s.title}>
        {title}<Text style={s.accent}> {accentText}</Text>
      </Text>
      <Text style={s.sub}>{subtitle}</Text>
      {showMetrics && (
        <View style={s.metricsRow}>
          <View style={s.metric}><Text style={s.metricVal}>12K+</Text><Text style={s.metricLbl}>Utilisateurs</Text></View>
          <View style={s.metricSep} />
          <View style={s.metric}><Text style={s.metricVal}>99.9%</Text><Text style={s.metricLbl}>Uptime</Text></View>
          <View style={s.metricSep} />
          <View style={s.metric}><Text style={s.metricVal}>4.9★</Text><Text style={s.metricLbl}>Note</Text></View>
        </View>
      )}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.dark,
    margin: Spacing.lg,
    borderRadius: 28,
    padding: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  ring1: {
    position: 'absolute',
    width: 220, height: 220,
    borderRadius: 110,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)',
    top: -70, right: -50,
  },
  ring2: {
    position: 'absolute',
    width: 140, height: 140,
    borderRadius: 70,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.1)',
    top: -20, right: -5,
  },
  ring3: {
    position: 'absolute',
    width: 70, height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(167,139,250,0.06)',
    bottom: -15, left: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logoMark: {
    width: 34, height: 34,
    borderRadius: Radius.md,
    backgroundColor: C.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  logoIcon: { fontSize: 16 },
  logoName: {
    fontSize: 13, fontWeight: '800',
    color: C.white, letterSpacing: -0.3,
  },
  logoVersion: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    borderRadius: 50,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
  },
  badgeDot: {
    width: 5, height: 5,
    borderRadius: 3,
    backgroundColor: C.green,
  },
  badgeTxt: {
    fontSize: 7, fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22, fontWeight: '800',
    color: C.white,
    letterSpacing: -0.8,
    lineHeight: 28,
  },
  accent: { color: C.purpleL },
  sub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 5,
    marginBottom: Spacing.lg,
  },
  metricsRow: { flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1 },
  metricVal: {
    fontSize: 14, fontWeight: '800',
    color: C.white,
  },
  metricLbl: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  metricSep: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    height: 24,
    marginHorizontal: Spacing.md,
  },
});
