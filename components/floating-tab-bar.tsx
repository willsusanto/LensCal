import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/animated-pressable';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { palette } from '@/constants/palette';

const tabMeta = {
  index: {
    label: 'Today',
    icon: 'calendar',
  },
  history: {
    label: 'History',
    icon: 'clock.arrow.circlepath',
  },
  settings: {
    label: 'Settings',
    icon: 'gearshape',
  },
} as const;

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18).stiffness(220)}
      style={{
        position: 'absolute',
        left: 18,
        right: 18,
        bottom: Math.max(14, insets.bottom + 8),
        height: 70,
        borderRadius: 999,
        backgroundColor: palette.blueDeep,
        padding: 7,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        boxShadow: `0 18px 36px ${palette.blueShadow}`,
      }}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = tabMeta[route.name as keyof typeof tabMeta];
        const options = descriptors[route.key]?.options;
        const label = meta?.label ?? options?.title ?? route.name;

        return (
          <AnimatedPressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options?.tabBarAccessibilityLabel}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            pressedScale={0.94}
            style={{
              height: 56,
              flex: focused ? 1.55 : 0.72,
              minWidth: focused ? 112 : 52,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: focused ? 7 : 0,
              backgroundColor: focused ? palette.surface : 'rgba(255, 255, 255, 0.14)',
            }}>
            <IconSymbol
              name={meta?.icon ?? 'calendar'}
              color={focused ? palette.black : palette.white}
              size={focused ? 22 : 24}
            />
            {focused ? (
              <Text
                selectable
                numberOfLines={1}
                style={{ color: palette.black, fontSize: 13, fontWeight: '900' }}>
                {label}
              </Text>
            ) : null}
          </AnimatedPressable>
        );
      })}
    </Animated.View>
  );
}
