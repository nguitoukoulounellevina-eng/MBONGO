import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const pushTokenData = await Notifications.getExpoPushTokenAsync();
    const token = pushTokenData.data;

    await api.deviceTokens.register(token, Platform.OS);
    return token;
  } catch {
    return null;
  }
}

export function setupNotificationListener(
  onNotification?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void,
) {
  const notifListener = onNotification
    ? Notifications.addNotificationReceivedListener(onNotification)
    : null;

  const responseListener = onResponse
    ? Notifications.addNotificationResponseReceivedListener(onResponse)
    : null;

  return () => {
    if (notifListener) notifListener.remove();
    if (responseListener) responseListener.remove();
  };
}
