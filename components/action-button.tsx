import { Pressable, Text } from 'react-native';

import { palette } from '@/constants/palette';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'warning' | 'danger';
  disabled?: boolean;
};

const toneStyles = {
  primary: {
    backgroundColor: palette.black,
    borderColor: palette.black,
    color: palette.white,
  },
  secondary: {
    backgroundColor: palette.surface,
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
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        flexGrow: 1,
        flexBasis: 96,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: style.borderColor,
        backgroundColor: style.backgroundColor,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
      })}>
      <Text
        selectable
        style={{
          color: style.color,
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'center',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}
