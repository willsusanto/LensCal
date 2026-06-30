import { Button } from "@/components/ui/button";

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary" | "warning" | "danger";
  disabled?: boolean;
};

export function ActionButton({
  label,
  onPress,
  tone = "secondary",
  disabled = false,
}: ActionButtonProps) {
  const variant = {
    primary: "default",
    secondary: "secondary",
    warning: "soft",
    danger: "destructive",
  }[tone] as "default" | "secondary" | "soft" | "destructive";

  return (
    <Button
      type="button"
      variant={variant}
      onClick={onPress}
      disabled={disabled}
      className="min-w-24 flex-1"
    >
      {label}
    </Button>
  );
}
