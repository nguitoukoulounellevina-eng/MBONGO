import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Spacing, Radius } from '@/constants/spacing';

const TYPE_COLORS: Record<string, string> = {
  danger: '#FF4D6A',
  warning: '#F59E0B',
  success: '#22D3A5',
  info: '#3B82F6',
};

const TYPE_ICONS: Record<string, string> = {
  danger: '🚨',
  warning: '⚠️',
  success: '✅',
  info: '💡',
};

interface ToastItem {
  id: number;
  type: string;
  titre: string;
  message: string;
  icone?: string;
}

interface ToastContextType {
  showToast: (t: { type?: string; titre: string; message: string; icone?: string }) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [active, setActive] = useState<ToastItem | null>(null);
  const idRef = useRef(0);
  const busyRef = useRef(false);

  const processNext = useCallback(() => {
    setQueue(prev => {
      if (prev.length === 0) {
        busyRef.current = false;
        return prev;
      }
      const [next, ...rest] = prev;
      busyRef.current = true;
      setTimeout(() => setActive(next), 0);
      return rest;
    });
  }, []);

  const dismiss = useCallback(() => {
    setActive(null);
    setTimeout(processNext, 200);
  }, [processNext]);

  const showToast = useCallback((t: { type?: string; titre: string; message: string; icone?: string }) => {
    const item: ToastItem = { id: ++idRef.current, type: t.type || 'info', titre: t.titre, message: t.message, icone: t.icone };
    setQueue(prev => [...prev, item]);
    if (!busyRef.current) processNext();
  }, [processNext]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {active && (
        <Toast
          key={active.id}
          item={active}
          onDismiss={dismiss}
        />
      )}
    </ToastContext.Provider>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const color = TYPE_COLORS[item.type] || TYPE_COLORS.info;
  const icon = item.icone || TYPE_ICONS[item.type] || '💡';

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });
    const timer = setTimeout(() => {
      translateY.value = withTiming(-120, { duration: 300 });
      opacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(onDismiss)();
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[s.wrap, animStyle]}>
      <View style={[s.toast, { borderLeftColor: color }]}>
        <Text style={s.icon}>{icon}</Text>
        <View style={s.content}>
          <Text style={s.titre} numberOfLines={1}>{item.titre}</Text>
          <Text style={s.message} numberOfLines={2}>{item.message}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export const useToast = () => useContext(ToastContext).showToast;

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
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
    padding: Spacing.md,
    shadowColor: '#0D0828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: { fontSize: 20, marginRight: Spacing.md },
  content: { flex: 1 },
  titre: { fontSize: 13, fontWeight: '800', color: '#0D0828', marginBottom: 2 },
  message: { fontSize: 11, color: '#666', lineHeight: 15 },
});
