// (7) Biometrické přihlášení — Face ID / Fingerprint
import { store } from './storage.js';

export const bio = {
  async isAvailable() {
    try {
      const mod = await import('@aparajita/capacitor-biometric-auth');
      const { BiometricAuth } = mod;
      const info = await BiometricAuth.checkBiometry();
      return info.isAvailable;
    } catch { return false; }
  },
  async saveCredentials(email, password) {
    await store.setUser({ __bioEmail: email });
    await window.localStorage.setItem('bio:pwd', btoa(password));
  },
  async authenticate() {
    const mod = await import('@aparajita/capacitor-biometric-auth');
    const { BiometricAuth } = mod;
    await BiometricAuth.authenticate({
      reason: 'Přihlášení do Zoom Pro Montér',
      cancelTitle: 'Zrušit',
      allowDeviceCredential: true,
      iosFallbackTitle: 'Použít heslo',
      androidTitle: 'Přihlaste se',
      androidSubtitle: 'Použijte otisk prstu / Face ID',
    });
    const u = await store.getUser();
    const pwd = window.localStorage.getItem('bio:pwd');
    return { email: u?.__bioEmail, password: pwd ? atob(pwd) : null };
  }
};
