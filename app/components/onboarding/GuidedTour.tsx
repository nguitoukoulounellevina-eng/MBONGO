import React, { useEffect, useRef } from 'react';
import {
  Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export type TourStep = {
  id: string;
  icon: string;
  title: string;
  description: string;
  route?: string;
};

interface GuidedTourProps {
  visible: boolean;
  current: number;
  steps: TourStep[];
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
  onAction: (route: string) => void;
}

export default function GuidedTour({
  visible, current, steps, onNext, onSkip, onComplete, onAction,
}: GuidedTourProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const isLast = current === steps.length - 1;
  const step = steps[current];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
    }
  }, [visible, current]);

  if (!visible || !step) return null;

  return (
    <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
      <View style={s.backdrop} />

      <Animated.View style={[s.card, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={['#0D0828', '#1A0E3E']} style={s.cardGradient}>
          <View style={s.cardContent}>
            {isLast && (
              <View style={s.motemaBadge}>
                <Text style={s.motemaBadgeTxt}>🤖 Dernière étape</Text>
              </View>
            )}

            <View style={s.iconWrap}>
              <Text style={s.icon}>{step.icon}</Text>
            </View>

            <Text style={s.title}>{step.title}</Text>
            <Text style={s.description}>{step.description}</Text>

            {step.route && !isLast && (
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => onAction(step.route!)}
                activeOpacity={0.88}
              >
                <Text style={s.actionTxt}>{step.title.replace(/^\d+\. /, '')} ➔</Text>
              </TouchableOpacity>
            )}

            {isLast && (
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => onAction(step.route! || '/(tabs)/ia')}
                activeOpacity={0.88}
              >
                <Text style={s.actionTxt}>Parler à Motéma ➔</Text>
              </TouchableOpacity>
            )}

            <View style={s.dotsRow}>
              {steps.map((_, i) => (
                <View key={i} style={[s.dot, current === i && s.dotOn]} />
              ))}
            </View>

            <View style={s.btnRow}>
              {!isLast && (
                <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={s.skipBtn}>
                  <Text style={s.skipTxt}>Passer le tour</Text>
                </TouchableOpacity>
              )}
              {!step.route && (
                <TouchableOpacity
                  style={s.nextBtn}
                  onPress={isLast ? onComplete : onNext}
                  activeOpacity={0.88}
                >
                  <Text style={s.nextTxt}>
                    {isLast ? 'Terminer' : 'Suivant'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,8,40,0.7)',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 100,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: 24,
    padding: 24,
  },
  cardContent: {
    alignItems: 'center',
  },
  motemaBadge: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  motemaBadgeTxt: {
    fontSize: 11,
    color: '#A78BFA',
    fontWeight: '700',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: { fontSize: 28 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  actionBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 50,
    paddingVertical: 13,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionTxt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotOn: {
    width: 20,
    backgroundColor: '#7C3AED',
    borderRadius: 3,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipTxt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: 'center',
  },
  nextTxt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
