import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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

if (typeof document !== 'undefined' && import.meta.env.MODE !== 'test') {
  mountApp();
}
