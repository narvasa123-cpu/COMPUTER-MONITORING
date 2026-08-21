import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
  const isConsoleApi = requestUrl.startsWith('/api/') && !requestUrl.startsWith('/api/auth/');
  const token = localStorage.getItem('sys_auth_token');

  if (!isConsoleApi || !token) return nativeFetch(input, init);

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return nativeFetch(input, { ...init, headers });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
