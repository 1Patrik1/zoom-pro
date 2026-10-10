// Hlasitá kritická upozornění — siréna 5 s, opakování 3× + vibrace + lokální notifikace
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Jedna siréna: 5 sekund, střídavý tón 600↔1200 Hz, plná hlasitost
export function playSirenOnce(seconds = 5) {
  return new Promise((resolve) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.9, ctx.currentTime);
      const end = ctx.currentTime + seconds;
      let t = ctx.currentTime;
      while (t < end) {
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.linearRampToValueAtTime(1200, t + 0.25);
        osc.frequency.linearRampToValueAtTime(600, t + 0.5);
        t += 0.5;
      }
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(end);
      osc.onended = () => resolve();
    } catch {
      resolve();
    }
  });
}

// Opakování 3× s krátkou pauzou
export async function playCriticalAlarm({ times = 3, seconds = 5 } = {}) {
  for (let i = 0; i < times; i += 1) {
    await playSirenOnce(seconds);
    if (i < times - 1) await new Promise((r) => setTimeout(r, 400));
  }
}

// Kompletní kritická událost: vibrace + notifikace + hlasitý alarm 3×5 s
export async function criticalNotify({ title, body }) {
  await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
  await LocalNotifications.schedule({
    notifications: [{ id: Date.now() % 100000, title, body }],
  }).catch(() => {});
  playCriticalAlarm({ times: 3, seconds: 5 }).catch(() => {});
}
