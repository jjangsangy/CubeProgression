import type { PWAInstallElement } from '@khmyznikov/pwa-install';
import '@khmyznikov/pwa-install';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { useTheme } from '../theme/ThemeContext';

interface PwaInstallBridgeProps {
  manifestUrl?: string;
  name?: string;
  description?: string;
  icon?: string;
}

export const PwaInstallBridge: React.FC<PwaInstallBridgeProps> = ({
  manifestUrl,
  name = 'CubeProgression',
  description = 'Speedcubing solve time progression & statistical shift analyzer',
  icon,
}) => {
  const { colors } = useTheme();
  const installRef = useRef<PWAInstallElement | null>(null);

  const baseUrl = import.meta.env.BASE_URL || './';
  const defaultManifest = baseUrl.endsWith('/')
    ? `${baseUrl}manifest.webmanifest`
    : `${baseUrl}/manifest.webmanifest`;
  const defaultIcon = baseUrl.endsWith('/') ? `${baseUrl}favicon.svg` : `${baseUrl}/favicon.svg`;

  const finalManifest = manifestUrl ?? defaultManifest;
  const finalIcon = icon ?? defaultIcon;

  useEffect(() => {
    if (installRef.current) {
      const el = installRef.current as HTMLElement & {
        styles?: Record<string, string>;
      };
      el.styles = { '--tint-color': colors.accent };
    }
  }, [colors.accent]);

  return (
    <pwa-install
      ref={installRef}
      id="pwa-install"
      manual-apple="true"
      manual-chrome="true"
      manual-how-to="true"
      manifest-url={finalManifest}
      name={name}
      description={description}
      icon={finalIcon}
    />
  );
};
