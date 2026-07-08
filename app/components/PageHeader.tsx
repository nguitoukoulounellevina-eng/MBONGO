import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/app/contexts/ThemeContext';

function hexToRgb(hex: string) {
  const c = hex.replace('#', '');
  return { r: parseInt(c.substring(0, 2), 16), g: parseInt(c.substring(2, 4), 16), b: parseInt(c.substring(4, 6), 16) };
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amount;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r + (255 - r) * amount)},${Math.round(g + (255 - g) * amount)},${Math.round(b + (255 - b) * amount)})`;
}

type Props = {
  title: string;
  icon?: string;
  subtitle?: string;
  backRoute?: string;
  right?: React.ReactNode;
  bottom?: React.ReactNode;
  style?: ViewStyle;
  color?: string;
};

export const PageHeader = React.memo(function PageHeader({ title, icon, subtitle, backRoute, right, bottom, style, color }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: C } = useTheme();
  const bgColor = color ? (isDark ? C.bg : color) : (isDark ? C.bg : '#F0EAFF');
  const gradientColors = [bgColor, bgColor, bgColor] as const;
  const ringColor = 'rgba(167,139,250,0.1)';
  const ringColor2 = 'rgba(167,139,250,0.06)';
  const textColor = (!color && !isDark) ? '#1A153A' : '#FFF';

  return (
    <LinearGradient colors={gradientColors} style={[styles.header, { paddingTop: insets.top + 6 }, style]}>
      <View style={[styles.ring1, { borderColor: ringColor }]} />
      <View style={[styles.ring2, { borderColor: ringColor2 }]} />
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => (backRoute ? router.push(backRoute) : router.back())} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back-outline" size={22} color={textColor} />
        </TouchableOpacity>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        {subtitle ? (
          <View style={styles.titleCol}>
            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        ) : (
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        )}
        <View style={{ flex: 1 }} />
        {right ?? null}
      </View>
      {bottom ?? null}
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  header: {
    overflow: 'hidden',
    position: 'relative',
    paddingBottom: 14,
  },
  ring1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    top: -50,
    right: -30,
  },
  ring2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    top: 10,
    right: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  icon: {
    fontSize: 18,
    marginRight: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  titleCol: {
    flex: 1,
    flexDirection: 'column',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: -1,
  },
});
