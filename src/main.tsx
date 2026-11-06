import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

declare global {
  interface Window {
    catalystWindow?: (command: 'min' | 'max' | 'close') => void;
  }
}

window.catalystWindow = (command) => {
  const ipc = (window as Window & { ipc?: { postMessage?: (value: string) => void } }).ipc;
  if (ipc?.postMessage) return ipc.postMessage(command);
  if (command === 'close') window.close();
  if (command === 'min') window.blur();
  if (command === 'max') window.resizeTo(screen.availWidth, screen.availHeight);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
