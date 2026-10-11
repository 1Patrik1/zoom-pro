// Hlasitá kritická upozornění ve webové appce — siréna 5 s, opakování 3×
let audioCtx = null;
let activeOscs = [];

// Okamžité ztišení sirény (zastavení běžícího alarmu)
export function stopAlarm() {
  for (const o of activeOscs) { try { o.stop(); } catch { /* ignore */ } }
  activeOscs = [];
}

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function playSirenOnce(seconds = 5, melody = 'siren') {
  return new Promise((resolve) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = melody === 'bell' ? 'sine' : melody === 'pulse' ? 'square' : 'sawtooth';
      gain.gain.setValueAtTime(0.9, ctx.currentTime);
      const end = ctx.currentTime + seconds;
      let t = ctx.currentTime;
      while (t < end) {
        if (melody === 'bell') {
          osc.frequency.setValueAtTime(880, t);
          osc.frequency.setValueAtTime(660, t + 0.16);
          t += 0.55;
        } else if (melody === 'pulse') {
          osc.frequency.setValueAtTime(740, t);
          t += 0.34;
        } else {
          osc.frequency.setValueAtTime(600, t);
          osc.frequency.linearRampToValueAtTime(1200, t + 0.25);
          osc.frequency.linearRampToValueAtTime(600, t + 0.5);
          t += 0.5;
        }
      }
      osc.connect(gain).connect(ctx.destination);
      activeOscs.push(osc);
      osc.start();
      osc.stop(end);
      osc.onended = () => { activeOscs = activeOscs.filter((x) => x !== osc); resolve(); };
    } catch {
      resolve();
    }
  });
}

export async function playCriticalAlarm({ times = 3, seconds = 5 } = {}) {
  const melody = localStorage.getItem('zp_alarm_melody') || 'siren';
  for (let i = 0; i < times; i += 1) {
    await playSirenOnce(seconds, melody);
    if (i < times - 1) await new Promise((r) => setTimeout(r, 400));
  }
}
