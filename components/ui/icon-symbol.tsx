import {
  AlertTriangle,
  Bell,
  Calendar,
  Clock,
  Eye,
  type LucideIcon,
  RefreshCw,
  Settings,
  Trash2,
} from 'lucide-react';

const MAPPING: Record<string, LucideIcon> = {
  'eye.fill': Eye,
  calendar: Calendar,
  'clock.arrow.circlepath': Clock,
  gearshape: Settings,
  'arrow.triangle.2.circlepath': RefreshCw,
  'exclamationmark.triangle.fill': AlertTriangle,
  'trash.fill': Trash2,
  'bell.fill': Bell,
};

type IconSymbolProps = {
  name: keyof typeof MAPPING;
  size?: number;
  color?: string;
  className?: string;
};

export function IconSymbol({ name, size = 24, color, className }: IconSymbolProps) {
  const Icon = MAPPING[name];
  if (!Icon) return null;
  return <Icon size={size} color={color} className={className} />;
}

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
