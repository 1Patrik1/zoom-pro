// (6) Firebase Cloud Messaging + Push Notifications registrace
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Device } from '@capacitor/device';
import { api } from './api.js';
import { playCriticalAlarm } from './alerts.js';

export async function registerPush(token) {
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return { ok: false, reason: 'denied' };
  await LocalNotifications.requestPermissions().catch(() => {});
  await PushNotifications.createChannel({
    id: 'zoom-pro-alerts', name: 'Zoom Pro upozornění', description: 'Chaty, podpora a důležité změny',
    importance: 5, visibility: 1, sound: 'default', vibration: true
  }).catch(() => {});
  const device = await Device.getInfo().catch(() => null);

  return new Promise((resolve) => {
    let settled = false;
    let handles = [];
    const finish = async (result) => {
      if (settled) return;
      settled = true;
      await Promise.all(handles.map((handle) => handle.remove().catch(() => {})));
      resolve(result);
    };

    (async () => {
      try {
        handles = await Promise.all([
          PushNotifications.addListener('registration', async (t) => {
            try {
              await api.request('/api/devices/register', {
                method: 'POST', token,
                body: { pushToken: t.value, platform: device?.platform || 'unknown' },
              });
              await finish({ ok: true, token: t.value });
            } catch (error) {
              await finish({ ok: false, reason: `server-registration-failed: ${error.message}` });
            }
          }),
          PushNotifications.addListener('registrationError', (err) => finish({ ok: false, reason: err.error })),
          PushNotifications.addListener('pushNotificationReceived', (n) => {
            LocalNotifications.schedule({ notifications: [{ id: Date.now() % 2147483647, title: n.title || 'Zoom Pro', body: n.body || 'Máte nové upozornění.', sound: 'default', channelId: 'zoom-pro-alerts' }] }).catch(() => {});
            playCriticalAlarm({ times: 1, seconds: 2 }).catch(() => {});
          }),
          PushNotifications.addListener('pushNotificationActionPerformed', (n) => {
            console.log('Push tap:', n);
          })
        ]);
        await PushNotifications.register();
      } catch (error) {
        await finish({ ok: false, reason: error.message });
      }
    })();
  });
}
