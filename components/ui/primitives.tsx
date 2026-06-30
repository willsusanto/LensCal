import type { ReactNode } from 'react';
import { Text, View, type ViewStyle } from 'react-native';

import { palette } from '@/constants/palette';

export function Card({
  children,
  tone = 'default',
  style,
}: {
  children: ReactNode;
  tone?: 'default' | 'soft' | 'dark';
  style?: ViewStyle;
}) {
  const toneStyle =
    tone === 'dark'
      ? {
          backgroundColor: palette.black,
          borderColor: palette.black,
        }
      : tone === 'soft'
        ? {
            backgroundColor: 'rgba(255, 255, 255, 0.62)',
            borderColor: palette.line,
          }
        : {
            backgroundColor: palette.surface,
            borderColor: 'rgba(255, 255, 255, 0.72)',
          };

  return (
    <View
      style={{
        borderRadius: 8,
        borderCurve: 'continuous',
        borderWidth: 1,
        padding: 16,
        boxShadow: `0 18px 44px ${palette.softShadow}`,
        ...toneStyle,
        ...style,
      }}>
      {children}
    </View>
  );
}

export function Badge({
  children,
  tone = 'secondary',
}: {
  children: ReactNode;
  tone?: 'primary' | 'secondary' | 'dark' | 'danger' | 'warning';
}) {
  const toneStyle = {
    primary: {
      backgroundColor: palette.coral,
      color: palette.white,
    },
    secondary: {
      backgroundColor: palette.faint,
      color: palette.muted,
    },
    dark: {
      backgroundColor: palette.black,
      color: palette.white,
    },
    danger: {
      backgroundColor: palette.dangerBg,
      color: palette.danger,
    },
    warning: {
      backgroundColor: palette.warningBg,
      color: palette.warning,
    },
  }[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        backgroundColor: toneStyle.backgroundColor,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}>
      <Text selectable style={{ color: toneStyle.color, fontSize: 11, fontWeight: '900' }}>
        {children}
      </Text>
    </View>
  );
}
