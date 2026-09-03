import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import LiveApp from './live/LiveApp.tsx';
import './index.css';

// The server-backed base lives behind #/live while the foundation is being
// built out. The existing tactical client is untouched at the root URL, so
// work on real persistence cannot break what is already deployed.
const isLive = window.location.hash.startsWith('#/live');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isLive ? <LiveApp /> : <App />}</StrictMode>,
);
