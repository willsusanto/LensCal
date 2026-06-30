import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LensProvider } from '@/providers/lens-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LensProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="replace-lens" options={{ presentation: 'modal', title: 'Replace Lens' }} />
        </Stack>
        <StatusBar style="auto" />
      </LensProvider>
    </ThemeProvider>
  );
}
