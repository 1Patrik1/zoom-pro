// (6) Firebase Cloud Messaging + Push Notifications registrace
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './api.js';
import { playCriticalAlarm } from './alerts.js';

export async function registerPush(token) {
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return { ok: false, reason: 'denied' };
  await PushNotifications.register();

  return new Promise((resolve) => {
    PushNotifications.addListener('registration', async (t) => {
      try {
        await api.request('/api/devices/register', {
          method: 'POST', token,
          body: { pushToken: t.value, platform: 'android' /* nebo ios */ },
        });
      } catch { /* ignore */ }
      resolve({ ok: true, token: t.value });
    });
    PushNotifications.addListener('registrationError', (err) => resolve({ ok: false, reason: err.error }));
    PushNotifications.addListener('pushNotificationReceived', (n) => {
      console.log('Push:', n);
      // Kritické události (chat, poruchy, havárie, kolize, sklad) — hlasitě 3× 5 s
      playCriticalAlarm({ times: 3, seconds: 5 }).catch(() => {});
    });
    PushNotifications.addListener('pushNotificationActionPerformed', (n) => {
      console.log('Push tap:', n);
    });
  });
}
