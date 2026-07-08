import { Pressable } from 'react-native';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedTabButton({ style, onPressIn, onPressOut, ...rest }: any) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e: any) => {
        scale.value = withSpring(0.92, { damping: 15, stiffness: 200 });
        onPressIn?.(e);
      }}
      onPressOut={(e: any) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    />
  );
}
