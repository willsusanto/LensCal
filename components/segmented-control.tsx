import { AnimatedPressable } from '@/components/animated-pressable';
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
    <div
      className="flex rounded-full border p-1 gap-1"
      style={{ borderColor: palette.line, backgroundColor: palette.surfaceSoft }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <AnimatedPressable
            key={option.value}
            disabled={disabled}
            pressedScale={0.97}
            onClick={() => onChange(option.value)}
            className="flex-1 min-h-[38px] flex items-center justify-center rounded-full text-sm px-2 font-extrabold"
            style={{
              backgroundColor: selected ? palette.white : 'transparent',
              color: selected ? palette.ink : palette.muted,
              fontWeight: selected ? '800' : '700',
              boxShadow: selected ? `0 8px 18px ` : undefined,
              opacity: disabled ? 0.45 : undefined,
            }}
          >
            {option.label}
          </AnimatedPressable>
        );
      })}
    </div>
  );
}
