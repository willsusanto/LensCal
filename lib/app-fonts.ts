import { Text, TextInput, type TextInputProps, type TextProps } from 'react-native';

export const fontFamilies = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extraBold: 'PlusJakartaSans-ExtraBold',
};

type TextComponentWithDefaults = typeof Text & {
  defaultProps?: TextProps;
};

type TextInputComponentWithDefaults = typeof TextInput & {
  defaultProps?: TextInputProps;
};

let isConfigured = false;

export function configureAppFonts() {
  if (isConfigured) {
    return;
  }

  const text = Text as TextComponentWithDefaults;
  const textInput = TextInput as TextInputComponentWithDefaults;

  text.defaultProps = {
    ...text.defaultProps,
    style: [{ fontFamily: fontFamilies.regular }, text.defaultProps?.style],
  };

  textInput.defaultProps = {
    ...textInput.defaultProps,
    style: [{ fontFamily: fontFamilies.regular }, textInput.defaultProps?.style],
  };

  isConfigured = true;
}
