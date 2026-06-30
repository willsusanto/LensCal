import { AnimatedPressable } from '@/components/animated-pressable';
import { palette } from '@/constants/palette';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'warning' | 'danger';
  disabled?: boolean;
};

const toneStyles = {
  primary: { backgroundColor: palette.black, borderColor: palette.black, color: palette.white },
  secondary: { backgroundColor: palette.surface, borderColor: palette.line, color: palette.ink },
  warning: { backgroundColor: palette.warningBg, borderColor: '#F1D596', color: palette.warning },
  danger: { backgroundColor: palette.dangerBg, borderColor: '#F0B7C0', color: palette.danger },
};

export function ActionButton({
  label,
  onPress,
  tone = 'secondary',
  disabled = false,
}: ActionButtonProps) {
  const s = toneStyles[tone];

  return (
    <AnimatedPressable
      onClick={onPress}
      disabled={disabled}
      className="flex-1 min-h-[44px] flex items-center justify-center rounded-full border text-sm font-black px-3 py-2.5"
      style={{
        backgroundColor: s.backgroundColor,
        borderColor: s.borderColor,
        color: s.color,
        boxShadow: tone === 'primary' ? `0 14px 28px ${palette.shadow}` : undefined,
        opacity: disabled ? 0.45 : undefined,
        minWidth: 96,
      }}
    >
      {label}
    </AnimatedPressable>
  );
}

