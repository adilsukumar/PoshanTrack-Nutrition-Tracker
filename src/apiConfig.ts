import * as SecureStore from 'expo-secure-store';
let configuredUrl = '';
export function setApiUrl(url: string) { configuredUrl = /^https:\/\//.test(url) ? url.replace(/\/$/, '') : ''; }
export function getApiUrl() { return configuredUrl || process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'https://poshantrack-photo-ai.onrender.com'; }
export async function getBackendKey() { return await SecureStore.getItemAsync('poshan.backend.key') || ''; }
export async function configureBackend(url: string, key: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error('Use your trusted server’s HTTPS origin, without a path.');
  if (!/^(?:[a-fA-F0-9]{32}|[a-fA-F0-9]{64})$/.test(key)) throw new Error('Enter the 32- or 64-character private access code generated for your server—not a Gemini API key.');
  await SecureStore.setItemAsync('poshan.backend.url', parsed.origin);
  await SecureStore.setItemAsync('poshan.backend.key', key);
  configuredUrl = parsed.origin;
}
export async function restoreBackend() { const url = await SecureStore.getItemAsync('poshan.backend.url'); if (url) setApiUrl(url); }
