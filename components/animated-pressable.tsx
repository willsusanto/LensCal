import type { ComponentProps, ReactNode } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type PressableProps = ComponentProps<typeof Pressable>;

type AnimatedPressableProps = PressableProps & {
  children: ReactNode;
  pressedScale?: number;
};

export function AnimatedPressable({
  children,
  onPressIn,
  onPressOut,
  pressedScale = 0.96,
  style,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableBase
      {...props}
      onPressIn={(event) => {
        scale.value = withSpring(pressedScale, { damping: 18, stiffness: 420 });
        opacity.value = withTiming(0.82, { duration: 90 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, { damping: 18, stiffness: 420 });
        opacity.value = withTiming(1, { duration: 120 });
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressableBase>
  );
}
