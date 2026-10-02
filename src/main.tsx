import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ensureTemporal } from './utils/temporalLoader';

export function mountApp(
  container: HTMLElement | null = document.getElementById('root'),
): Root | null {
  if (!container) return null;
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  return root;
}

export async function bootstrapApp(
  container: HTMLElement | null = document.getElementById('root'),
): Promise<Root | null> {
  await ensureTemporal();
  return mountApp(container);
}

if (typeof document !== 'undefined' && import.meta.env.MODE !== 'test') {
  bootstrapApp();
}
