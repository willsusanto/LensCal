import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { palette } from '@/constants/palette';
import { configureAppFonts, fontFamilies } from '@/lib/app-fonts';
import { LensProvider } from '@/providers/lens-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fontFamilies.regular]: require('@/assets/fonts/PlusJakartaSans-Regular.ttf'),
    [fontFamilies.medium]: require('@/assets/fonts/PlusJakartaSans-Medium.ttf'),
    [fontFamilies.semiBold]: require('@/assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    [fontFamilies.bold]: require('@/assets/fonts/PlusJakartaSans-Bold.ttf'),
    [fontFamilies.extraBold]: require('@/assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  configureAppFonts();

  return (
    <ThemeProvider value={DefaultTheme}>
      <LensProvider>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: palette.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="replace-lens"
            options={{
              presentation: 'modal',
              title: 'Change Lens',
              headerShadowVisible: false,
              headerStyle: { backgroundColor: palette.background },
              headerTitleStyle: { color: palette.ink, fontFamily: fontFamilies.extraBold, fontWeight: '900' },
            }}
          />
        </Stack>
        <StatusBar style="dark" backgroundColor={palette.background} translucent={false} />
      </LensProvider>
    </ThemeProvider>
  );
}
