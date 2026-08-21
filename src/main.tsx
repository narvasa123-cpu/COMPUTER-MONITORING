import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const nativeFetch = window.fetch.bind(window);
const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

window.fetch = (input, init = {}) => {
  const originalUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
  const requestUrl = apiBaseUrl && typeof input === 'string' && input.startsWith('/api/')
    ? `${apiBaseUrl}${input}`
    : input;
  const isConsoleApi = originalUrl.startsWith('/api/') && !originalUrl.startsWith('/api/auth/');
  const token = localStorage.getItem('sys_auth_token');

  if (!isConsoleApi || !token) return nativeFetch(requestUrl, init);

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return nativeFetch(requestUrl, { ...init, headers });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
