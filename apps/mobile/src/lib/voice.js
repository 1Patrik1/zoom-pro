// (3) Voice-to-text — Speech Recognition (nativní) + Web Speech fallback
let recognition = null;

export async function startDictation({ language = 'cs-CZ', onResult, onEnd }) {
  try {
    const mod = await import('@capacitor-community/speech-recognition');
    const { SpeechRecognition } = mod;
    await SpeechRecognition.requestPermissions();
    await SpeechRecognition.start({ language, popup: false, partialResults: true, maxResults: 3 });
    SpeechRecognition.addListener('partialResults', (data) => {
      if (data?.matches?.[0]) onResult?.(data.matches[0], false);
    });
    SpeechRecognition.addListener('listeningState', (s) => { if (!s.listening) onEnd?.(); });
    return async () => { await SpeechRecognition.stop(); };
  } catch {
    // Web fallback
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) throw new Error('Diktování není podporováno');
    recognition = new SR();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (e) => {
      const txt = Array.from(e.results).map((r) => r[0].transcript).join(' ');
      onResult?.(txt, e.results[e.results.length - 1].isFinal);
    };
    recognition.onend = () => onEnd?.();
    recognition.start();
    return () => { try { recognition?.stop(); } catch {} };
  }
}
