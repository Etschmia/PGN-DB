import type { AuthUser } from '../types';

const API_BASE = '/api/pgn/auth';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Unbekannter Fehler');
  }

  return data as T;
}

export async function register(email: string, password: string): Promise<{ message: string }> {
  return request(`${API_BASE}/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<{ user: AuthUser }> {
  return request(`${API_BASE}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await request(`${API_BASE}/logout`, { method: 'POST' });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return request(`${API_BASE}/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<{ user: AuthUser }> {
  return request(`${API_BASE}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function getMe(): Promise<{ user: AuthUser } | null> {
  try {
    return await request(`${API_BASE}/me`);
  } catch {
    return null;
  }
}
