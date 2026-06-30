import { Text } from 'react-native';

import { AnimatedPressable } from '@/components/animated-pressable';
import { palette } from '@/constants/palette';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'warning' | 'danger';
  disabled?: boolean;
};

const toneStyles = {
  primary: {
    backgroundColor: palette.coral,
    borderColor: palette.coral,
    color: palette.white,
  },
  secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderColor: palette.line,
    color: palette.ink,
  },
  warning: {
    backgroundColor: palette.warningBg,
    borderColor: '#F1D596',
    color: palette.warning,
  },
  danger: {
    backgroundColor: palette.dangerBg,
    borderColor: '#F0B7C0',
    color: palette.danger,
  },
};

export function ActionButton({
  label,
  onPress,
  tone = 'secondary',
  disabled = false,
}: ActionButtonProps) {
  const style = toneStyles[tone];

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 44,
        flexGrow: 1,
        flexBasis: 96,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: style.borderColor,
        backgroundColor: style.backgroundColor,
        boxShadow: tone === 'primary' ? `0 12px 24px ${palette.softShadow}` : 'none',
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}>
      <Text
        selectable
        style={{
          color: style.color,
          fontSize: 14,
          fontWeight: '900',
          textAlign: 'center',
        }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
