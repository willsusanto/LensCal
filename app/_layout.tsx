import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { palette } from '@/constants/palette';
import { LensProvider } from '@/providers/lens-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
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
              title: 'Replace Lens',
              headerShadowVisible: false,
              headerStyle: { backgroundColor: palette.background },
              headerTitleStyle: { color: palette.ink, fontWeight: '900' },
            }}
          />
        </Stack>
        <StatusBar style="dark" backgroundColor={palette.background} translucent={false} />
      </LensProvider>
    </ThemeProvider>
  );
}
