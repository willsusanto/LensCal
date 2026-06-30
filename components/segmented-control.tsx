import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-surfaceSoft p-1">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-10 rounded-md px-2 shadow-none",
              selected
                ? "bg-white text-ink shadow-sm hover:bg-white"
                : "text-muted hover:bg-white/60 hover:text-ink",
            )}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
