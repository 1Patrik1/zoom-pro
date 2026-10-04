import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export async function takePhoto({ quality = 78, maxSide = 1600 } = {}) {
  try {
    const p = await Camera.getPhoto({
      quality,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      correctOrientation: true,
      width: maxSide,
      saveToGallery: false
    });
    await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    return p.dataUrl; // 'data:image/jpeg;base64,...'
  } catch (e) {
    if (String(e).includes('cancelled')) return null;
    throw e;
  }
}

export async function pickFromGallery() {
  const p = await Camera.getPhoto({
    quality: 78,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Photos
  });
  return p.dataUrl;
}

export async function getPosition() {
  const perm = await Geolocation.checkPermissions();
  if (perm.location !== 'granted') await Geolocation.requestPermissions();
  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
}
