import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '@/app/contexts/ThemeContext';


const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabButton({
  route,
  descriptor,
  navigation,
  isFocused,
  color,
  activeColor,
  badge,
}: {
  route: any;
  descriptor: any;
  navigation: any;
  isFocused: boolean;
  color: string;
  activeColor: string;
}) {
  const scale = useSharedValue(1);
  const indicatorScale = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    indicatorScale.value = withSpring(isFocused ? 1 : 0, { damping: 18, stiffness: 220 });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: indicatorScale.value }],
    opacity: indicatorScale.value,
  }));

  const indicatorStaticStyle = {
    position: 'absolute' as const,
    width: 72,
    height: 56,
    borderRadius: 16,
    backgroundColor: activeColor + '30',
    top: 0,
    alignSelf: 'center' as const,
  };

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          indicatorStaticStyle,
          indicatorAnimatedStyle,
        ]}
      />
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.92, { damping: 15, stiffness: 200 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 200 }); }}
        style={[{ alignItems: 'center', justifyContent: 'center' }, animatedStyle]}
      >
        <View style={{ position: 'relative' }}>
          {descriptor.options.tabBarIcon?.({ color: isFocused ? activeColor : color, size: 22 })}
        </View>
        <Text style={{ fontSize: 10, fontWeight: '700', color: isFocused ? activeColor : color, marginTop: 2 }}>
          {descriptor.options.title}
        </Text>
      </AnimatedPressable>
    </View>
  );
}

export function GlassTabBar({ state, descriptors, navigation }: { state: any; descriptors: any; navigation: any }) {
  const { colors: C, isDark } = useTheme();

  const currentRoute = state.routes[state.index];

  if (descriptors[currentRoute.key]?.options?.tabBarStyle?.display === 'none') {
    return null;
  }

  const visibleRoutes = state.routes.filter(
    (route: any) => descriptors[route.key].options.tabBarIcon !== undefined
  );

  const currentRouteName = state.routes[state.index].name;
  const parentTab: Record<string, string> = {
    depenses: 'transactions',
    revenus: 'transactions',
    budget: 'transactions',
    comptes: 'transactions',
    categorie: 'transactions',
    objectifs_epargne: 'transactions',
    stats: 'transactions',
    archives: 'transactions',
    archive_detail: 'transactions',
    analyse_financiere: 'transactions',
    notifications: 'transactions',
    seuils: 'transactions',
  };

  const effectiveRouteName = parentTab[currentRouteName] || currentRouteName;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        height: 65,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={{
          flex: 1,
          borderRadius: 24,
          overflow: 'hidden',
          borderWidth: 0.5,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.3)',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 24,
            backgroundColor: isDark ? 'rgba(23, 16, 48, 0.4)' : 'rgba(255, 255, 255, 0.3)',
          }}
        />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'stretch', paddingBottom: 8, paddingTop: 6 }}>
          {visibleRoutes.map((route: any, index: number) => {
            const descriptor = descriptors[route.key];
            const isFocused = effectiveRouteName === route.name;

            return (
              <TabButton
                key={route.key}
                route={route}
                descriptor={descriptor}
                navigation={navigation}
                isFocused={isFocused}
                color={isDark ? '#8A86A8' : '#9590B0'}
                activeColor={C.purple}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
