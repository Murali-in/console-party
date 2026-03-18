import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { detectDevice, DeviceType } from '@/lib/deviceDetect';

interface DeviceContextType {
  device: DeviceType;
  isHost: boolean;
  isController: boolean;
}

const DeviceContext = createContext<DeviceContextType>({
  device: 'desktop',
  isHost: true,
  isController: false,
});

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<DeviceType>('desktop');

  useEffect(() => {
    const detected = detectDevice();
    setDevice(detected);

    const handleResize = () => setDevice(detectDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isHost = device === 'tv' || device === 'desktop' || device === 'car';
  const isController = device === 'mobile' || device === 'tablet';

  return (
    <DeviceContext.Provider value={{ device, isHost, isController }}>
      {children}
    </DeviceContext.Provider>
  );
}

export const useDevice = () => useContext(DeviceContext);
