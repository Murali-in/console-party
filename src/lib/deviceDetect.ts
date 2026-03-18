export type DeviceType = 'tv' | 'car' | 'mobile' | 'tablet' | 'desktop';

export function detectDevice(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const aspectRatio = window.innerWidth / window.innerHeight;

  // TV detection
  if (/tizen|webos|smarttv|hbbtv|android tv|googletv|crkey/i.test(ua)) {
    return 'tv';
  }

  // Car display detection
  if (/tesla|carplay|android auto/i.test(ua) || (hasTouch && aspectRatio > 2.0 && width > 1200)) {
    return 'car';
  }

  // Mobile
  if (width < 768 && hasTouch) {
    return 'mobile';
  }

  // Tablet
  if (width >= 768 && width < 1200 && hasTouch) {
    return 'tablet';
  }

  return 'desktop';
}

export function isHostDevice(device: DeviceType): boolean {
  return device === 'tv' || device === 'desktop' || device === 'car';
}

export function isControllerDevice(device: DeviceType): boolean {
  return device === 'mobile' || device === 'tablet';
}
