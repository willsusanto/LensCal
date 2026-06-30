import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
} from 'react-native';

import { fontFamilies } from '@/lib/app-fonts';

function fontFamilyForWeight(fontWeight: unknown) {
  const weight = String(fontWeight ?? '400');

  if (weight === '900' || weight === '800' || weight === 'bold') {
    return fontFamilies.extraBold;
  }

  if (weight === '700') {
    return fontFamilies.bold;
  }

  if (weight === '600') {
    return fontFamilies.semiBold;
  }

  if (weight === '500') {
    return fontFamilies.medium;
  }

  return fontFamilies.regular;
}

function fontStyleFrom(style: TextProps['style'] | TextInputProps['style']) {
  const flattened = StyleSheet.flatten(style);

  if (flattened?.fontFamily) {
    return null;
  }

  return {
    fontFamily: fontFamilyForWeight(flattened?.fontWeight),
    fontWeight: undefined,
  };
}

export function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[style, fontStyleFrom(style)]} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return <NativeTextInput {...props} style={[style, fontStyleFrom(style)]} />;
}
