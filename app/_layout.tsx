import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { loadAuth, getToken, clearAuth, API_BASE } from '@/app/services/api';
import { NotificationProvider, useNotifications } from '@/app/services/NotificationContext';
import { registerForPushNotifications } from '@/app/services/PushNotificationService';
import { ThemeProvider as CustomThemeProvider, useTheme } from '@/app/contexts/ThemeContext';
import { I18nProvider } from '@/app/contexts/I18nContext';
import { PeriodProvider } from '@/app/contexts/PeriodContext';
import AlertToast from '@/components/AlertToast';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppNavigator() {
  const { isDark } = useTheme();
  const { lastNotification, clearLastNotification } = useNotifications();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      {lastNotification && (
        <AlertToast
          visible
          type={lastNotification.type}
          titre={lastNotification.titre}
          message={lastNotification.message}
          route="notifications"
          onDismiss={clearLastNotification}
        />
      )}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadAuth().then(async () => {
      const hasToken = !!getToken();
      if (hasToken) {
          try {
            const res = await fetch(`${API_BASE}/users/me`, {
              headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.status === 401) clearAuth();
          } catch {
            // serveur injoignable → on laisse le token, tentative au prochain appel
          }
        }
      setReady(true);
      if (getToken()) {
        registerForPushNotifications();
      }
      setTimeout(() => {
        router.replace(getToken() ? '/(tabs)/home' : '/(tabs)');
      }, 0);
    });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0828', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <NotificationProvider>
      <CustomThemeProvider>
        <I18nProvider>
          <PeriodProvider>
            <AppNavigator />
          </PeriodProvider>
        </I18nProvider>
      </CustomThemeProvider>
    </NotificationProvider>
  );
}
