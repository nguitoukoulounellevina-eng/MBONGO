import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Spacing, Radius } from '@/constants/spacing';

const C = { dark: '#0D0828', white: '#FFFFFF', danger: '#FF4D6A', warning: '#F59E0B', success: '#22D3A5', info: '#3B82F6' };
const TYPE_COLORS: Record<string, string> = { danger: C.danger, warning: C.warning, success: C.success, info: C.info };

interface AlertToastProps {
  visible: boolean;
  type?: string;
  icone?: string;
  titre: string;
  message: string;
  route?: string;
  duration?: number;
  onDismiss: () => void;
}

export default function AlertToast({ visible, type = 'info', icone = '💡', titre, message, route, duration = 4000, onDismiss }: AlertToastProps) {
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
      const timer = setTimeout(() => {
        translateY.value = withTiming(-120, { duration: 300 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)();
        });
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const bgColor = TYPE_COLORS[type] || C.info;

  return (
    <Animated.View style={[s.wrap, animStyle]}>
      <TouchableOpacity
        style={[s.toast, { borderLeftColor: bgColor }]}
        activeOpacity={0.9}
        onPress={() => {
          translateY.value = withTiming(-120, { duration: 200 });
          if (route) router.push(`/${route}` as any);
          onDismiss();
        }}
      >
        <Text style={s.icone}>{icone}</Text>
        <View style={s.content}>
          <Text style={s.titre} numberOfLines={1}>{titre}</Text>
          <Text style={s.message} numberOfLines={2}>{message}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
    elevation: 10,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
    padding: Spacing.md,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  icone: { fontSize: 20, marginRight: Spacing.md },
  content: { flex: 1 },
  titre: { fontSize: 13, fontWeight: '800', color: C.dark, marginBottom: 2 },
  message: { fontSize: 11, color: '#666', lineHeight: 15 },
});
