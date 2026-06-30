import { View } from 'react-native';

import { AnimatedPressable } from '@/components/animated-pressable';
import { Text } from '@/components/app-text';
import { palette } from '@/constants/palette';

type SegmentedControlProps<T extends string> = {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <View
      style={{
        flexDirection: 'row',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.line,
        backgroundColor: palette.surfaceSoft,
        padding: 4,
        gap: 4,
      }}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <AnimatedPressable
            key={option.value}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            pressedScale={0.97}
            style={{
              minHeight: 38,
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              backgroundColor: selected ? palette.white : 'transparent',
              boxShadow: selected ? `0 8px 18px ${palette.softShadow}` : 'none',
              opacity: disabled ? 0.45 : 1,
              paddingHorizontal: 8,
            }}>
            <Text
              selectable
              style={{
                color: selected ? palette.ink : palette.muted,
                fontSize: 14,
                fontWeight: selected ? '800' : '700',
                textAlign: 'center',
              }}>
              {option.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}
