import { useState, useEffect } from 'react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DeviceBreakpoints {
  mobile: number;
  tablet: number;
}

const DEFAULT_BREAKPOINTS: DeviceBreakpoints = {
  mobile: 768,
  tablet: 1024
};

export const useDeviceType = (breakpoints: DeviceBreakpoints = DEFAULT_BREAKPOINTS): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth;
      
      if (width < breakpoints.mobile) {
        setDeviceType('mobile');
      } else if (width < breakpoints.tablet) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    // Imposta il tipo iniziale
    updateDeviceType();

    // Aggiungi listener per resize
    window.addEventListener('resize', updateDeviceType);

    // Cleanup
    return () => window.removeEventListener('resize', updateDeviceType);
  }, [breakpoints]);

  return deviceType;
};

// Hook semplificato per controlli rapidi
export const useIsMobile = (): boolean => {
  const deviceType = useDeviceType();
  return deviceType === 'mobile';
};

export const useIsTablet = (): boolean => {
  const deviceType = useDeviceType();
  return deviceType === 'tablet';
};

export const useIsDesktop = (): boolean => {
  const deviceType = useDeviceType();
  return deviceType === 'desktop';
};
