import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TaskFlowApp from './app.jsx';
import '../base.css';
import '../components.css';

createRoot(document.getElementById('root')).render(<StrictMode><TaskFlowApp /></StrictMode>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}
