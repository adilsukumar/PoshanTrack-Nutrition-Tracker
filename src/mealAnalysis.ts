import { FoodAnalysis } from './types';
import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { getApiUrl, getBackendKey } from './apiConfig';
export async function checkPhotoServer(): Promise<void> {
  const url = getApiUrl(); const key = await getBackendKey();
  if (!/^https:\/\//.test(url) || !key) throw new Error('Save your HTTPS server address and private access code in Profile first.');
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(`${url}/api/status`, { headers: { 'X-Client-Key': key }, signal: controller.signal });
    if (response.status === 401) throw new Error('The private access code does not match this server. Check PRIVATE_CLIENT_KEY in Render.');
    if (!response.ok) throw new Error(`Server not ready (${response.status}). Check your Render deployment.`);
    const payload = await response.json();
    if (payload.ready !== true) throw new Error('Server reached, but no free-tier AI key is configured. Add GEMINI_API_KEY or GROQ_API_KEY in Render—not in this app.');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Server took too long to start. Free Render servers can sleep; retry shortly.');
    throw error;
  } finally { clearTimeout(timeout); }
}
export async function analyseMealPhoto(photoUri: string, context = '', capturedAt = new Date().toISOString()): Promise<FoodAnalysis> {
  const url = getApiUrl(); const key = await getBackendKey();
  if (!/^https:\/\//.test(url) || !key) throw new Error('Connect your private AI server in Profile first. Manual food logging still works offline.');
  const image = new File(photoUri);
  if (!image.exists || !image.size) throw new Error('This photo is no longer available. Choose it again or take a new photo.');
  if (image.size > 6 * 1024 * 1024) throw new Error('This photo is larger than 6 MB. Choose a smaller JPEG, PNG or WebP photo.');
  // Wake a sleeping free Render service before starting the analysis timeout.
  await checkPhotoServer();
  const form = new FormData();
  // SDK 57 fetch accepts File/Blob bytes, not React Native's legacy URI tuple.
  form.append('image', image);
  form.append('context', context.slice(0, 1500)); form.append('capturedAt', capturedAt);
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 65000);
  try {
    const response = await fetch(`${url}/api/analyse-meal`, { method: 'POST', body: form, headers: { 'X-Client-Key': key }, signal: controller.signal });
    const payload = await response.json().catch(() => { throw new Error('Server returned an unexpected response. Check the HTTPS address and Render deployment.'); });
    if (!response.ok) throw new Error(payload.error ?? `Analysis failed (${response.status})`);
    if (!Array.isArray(payload.items) || !payload.items.length) throw new Error('No usable food analysis returned.');
    return payload as FoodAnalysis;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Photo analysis took too long. Check your connection and retry once. The free AI services may be busy; manual food search still works offline.');
    throw error;
  } finally { clearTimeout(timeout); }
}
