import { router } from 'expo-router';
import React, { useRef, useState, useCallback } from 'react';
import {
  Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { setOnboardingDone } from '@/app/services/api';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'motema',
    emoji: '🤖',
    title: 'Bonjour 👋, je suis Motéma.',
    subtitle: 'Je suis votre assistant pour vous aider avec votre argent. Ensemble, nous allons suivre vos dépenses, réaliser vos projets et prendre les bonnes décisions.\n\nCommençons par quelques étapes simples pour personnaliser votre expérience.',
  },
  {
    id: 'finances',
    emoji: '📊',
    title: 'Suivez vos finances',
    subtitle: 'Consultez vos revenus, dépenses et budgets en un coup d\'œil. Tout est organisé pour vous.',
  },
  {
    id: 'objectifs',
    emoji: '🎯',
    title: 'Atteignez vos objectifs',
    subtitle: 'Épargnez, planifiez et suivez vos progrès. Motéma analyse vos habitudes et vous conseille.',
  },
  {
    id: 'go',
    emoji: '🚀',
    title: 'Prêt à découvrir MBONGO ?',
    subtitle: 'Votre tableau de bord vous attend. Motéma sera là pour vous guider à chaque étape.',
  },
];

export default function OnboardingScreen() {
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [current, setCurrent] = useState(0);
  const isLast = current === SLIDES.length - 1;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems.length > 0) setCurrent(viewableItems[0].index ?? 0);
    },
    []
  );

  const goNext = () => {
    if (isLast) return complete();
    flatRef.current?.scrollToIndex({ index: current + 1, animated: true });
  };

  const complete = async () => {
    await setOnboardingDone();
    router.replace('/(tabs)/home');
  };

  const skip = () => complete();

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={[s.slide, { width }]}>
      <View style={s.emojiWrap}>
        <Text style={s.emoji}>{item.emoji}</Text>
      </View>
      <Text style={s.title}>{item.title}</Text>
      <Text style={s.subtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <LinearGradient colors={['#0D0828', '#150B35']} style={s.root}>
      <StatusBar style="light" />
      <TouchableOpacity style={s.skipBtn} onPress={skip} activeOpacity={0.7}>
        <Text style={s.skipTxt}>Passer</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={s => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      <View style={s.footer}>
        <View style={s.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[s.dot, current === i && s.dotOn]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={s.cta}
          onPress={goNext}
          activeOpacity={0.88}
        >
          <Text style={s.ctaTxt}>{isLast ? 'Commencer' : 'Suivant'}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipTxt: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 0.3 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 140,
  },
  emojiWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  emoji: { fontSize: 44 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.1,
    paddingHorizontal: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 24,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotOn: {
    width: 24,
    backgroundColor: '#7C3AED',
    borderRadius: 4,
  },
  cta: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 50,
    minWidth: 200,
    alignItems: 'center',
  },
  ctaTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});
