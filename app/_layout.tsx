import '@/global.css';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const paperTheme = isDark
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: '#D4A5A5', // 藕粉色
          background: '#2B2B2B',
          surface: '#303030',
          onSurface: '#ECEDEE',
        },
      }
    : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: '#D4A5A5', // 藕粉色
          background: '#FAFAFA',
          surface: '#FFFFFF',
          onSurface: '#424242', // 深灰色
        },
      };

  // 在 Web 平台載入 Google Fonts
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700&display=swap';
    link.rel = 'stylesheet';
    if (!document.head.querySelector(`link[href="${link.href}"]`)) {
      document.head.appendChild(link);
    }
  }

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen 
            name="register" 
            options={{ 
              headerShown: false,
              presentation: 'card',
            }} 
          />
          <Stack.Screen 
            name="booking" 
            options={{ 
              headerShown: false,
              presentation: 'card',
            }} 
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  );
}

