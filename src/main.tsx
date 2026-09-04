import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import LiveApp from './live/LiveApp.tsx';
import './index.css';

// The game is closed: the root URL is the front door. Anyone arriving without
// an account gets sign in or request access, and nothing else.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LiveApp />
  </StrictMode>,
);
