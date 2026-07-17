import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { clearAllCache } from './cache';
import { clearAnalyseRapport } from './analyseCache';

const STORAGE_KEYS = { TOKEN: 'auth_token', USER: 'auth_user', ONBOARDING: 'onboarding_done', GUIDED_TOUR: 'guided_tour_done' };
const isWeb = Platform.OS === 'web';

async function setSecure(key: string, value: string) {
  if (isWeb) localStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}
async function getSecure(key: string) {
  if (isWeb) return localStorage.getItem(key);
  else return await SecureStore.getItemAsync(key);
}
async function delSecure(key: string) {
  if (isWeb) localStorage.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}

const API_PORT = '3000';

function getApiBaseUrl() {
  if (isWeb) return `http://localhost:${API_PORT}/api`;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:${API_PORT}/api`;
  }
  return Constants.expoConfig?.extra?.apiBaseUrl || `http://localhost:${API_PORT}/api`;
}

export const API_BASE = getApiBaseUrl();

let _token: string | null = null;

export const setToken = (t: string | null) => {
  _token = t;
  if (t) setSecure(STORAGE_KEYS.TOKEN, t);
  else delSecure(STORAGE_KEYS.TOKEN);
};
export const getToken = () => _token;

let _user: any = null;
export const setUser = (u: any) => {
  _user = u;
  if (u) setSecure(STORAGE_KEYS.USER, JSON.stringify(u));
  else delSecure(STORAGE_KEYS.USER);
};
export const getUser = () => _user;

export const loadAuth = async () => {
  try {
    const token = await getSecure(STORAGE_KEYS.TOKEN);
    const raw = await getSecure(STORAGE_KEYS.USER);
    if (token) _token = token;
    if (raw) _user = JSON.parse(raw);
  } catch {}
  return { token: _token, user: _user };
};

export const getOnboardingDone = async () => {
  const val = await getSecure(STORAGE_KEYS.ONBOARDING);
  return val === 'true';
};
export const setOnboardingDone = async () => {
  await setSecure(STORAGE_KEYS.ONBOARDING, 'true');
};
export const resetOnboardingDone = async () => {
  await delSecure(STORAGE_KEYS.ONBOARDING);
};

export const getGuidedTourDone = async () => {
  const val = await getSecure(STORAGE_KEYS.GUIDED_TOUR);
  return val === 'true';
};
export const setGuidedTourDone = async () => {
  await setSecure(STORAGE_KEYS.GUIDED_TOUR, 'true');
};
export const resetGuidedTourDone = async () => {
  await delSecure(STORAGE_KEYS.GUIDED_TOUR);
};

export const clearAuth = () => {
  setToken(null);
  setUser(null);
  clearAllCache();
  clearAnalyseRapport();
  for (const key of apiCache.keys()) apiCache.delete(key);
};

export const notify = (type: string, titre: string, message: string) => {
  const t = _token;
  if (!t) return;
  const url = `${API_BASE}/notifications`;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify({ type, titre, message }),
  }).catch(() => {});
};

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

// ─── Cache TTL (30s) ─────────────────────────────────
const cacheTTL = 30 * 1000;
const apiCache = new Map<string, { data: any; ts: number }>();

function getCached(method: string, endpoint: string): any | null {
  if (method !== 'GET') return null;
  const key = `GET:${endpoint}`;
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > cacheTTL) {
    apiCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(method: string, endpoint: string, data: any) {
  if (method !== 'GET') return;
  apiCache.set(`GET:${endpoint}`, { data, ts: Date.now() });
}

function invalidateCache() {
  for (const key of apiCache.keys()) {
    if (key.startsWith('GET:')) apiCache.delete(key);
  }
}

async function request(endpoint: string, options: RequestOptions = {}) {
  const method = options.method || 'GET';

  if (method === 'GET') {
    const cached = getCached('GET', endpoint);
    if (cached) {
      console.log('[API] CACHE HIT:', endpoint);
      return cached;
    }
  }

  const token = _token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let response;
  try {
    const url = `${API_BASE}${endpoint}`;
    const body = options.body ? JSON.stringify(options.body) : undefined;
    console.log('[API] OUTGOING:', method, url, body ? body.substring(0, 300) : '');
    response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    console.log('[API] RESPONSE status:', response.status, endpoint);
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json();

  if (response.status === 401) {
    if (!endpoint.includes('/auth/login')) {
      clearAuth();
      router.replace('/(tabs)');
    }
    throw new Error(data.message || 'Session expirée. Veuillez vous reconnecter.');
  }

  if (!response.ok) {
    console.log('[API] RESPONSE body:', JSON.stringify(data).substring(0, 500));
    const error = new Error(data.message || 'Erreur réseau');
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  console.log('[API] RESPONSE body:', JSON.stringify(data).substring(0, 500));

  if (method === 'GET') {
    setCache('GET', endpoint, data);
  } else {
    invalidateCache();
  }

  return data;
}

// ─── Period query helper ────────────────────────────
interface PeriodQuery { mois?: number; annee?: number; debut?: string; fin?: string; periode_type?: string }
function buildPeriodQuery(params?: PeriodQuery): string {
  if (!params) return '';
  const q = new URLSearchParams();
  if (params.debut && params.fin) {
    q.set('debut', params.debut);
    q.set('fin', params.fin);
    if (params.periode_type) q.set('periode_type', params.periode_type);
    return `?${q.toString()}`;
  }
  if (params.mois !== undefined) q.set('mois', String(params.mois));
  if (params.annee !== undefined) q.set('annee', String(params.annee));
  if (params.periode_type) q.set('periode_type', params.periode_type);
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

// ─── Auth ───────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, mot_de_passe: string) =>
      request('/auth/login', { method: 'POST', body: { email, mot_de_passe } }),

    loginByPhone: (telephone: string, mot_de_passe: string) =>
      request('/auth/login', { method: 'POST', body: { telephone, mot_de_passe } }),

    register: (data: { prenom: string; nom: string; email: string; telephone?: string; mot_de_passe: string; profil?: string }) =>
      request('/auth/register', { method: 'POST', body: data }),

    forgotPassword: (email: string) =>
      request('/auth/forgot-password', { method: 'POST', body: { email } }),

    resetPassword: (token: string, mot_de_passe: string) =>
      request('/auth/reset-password', { method: 'POST', body: { token, mot_de_passe } }),
  },

  users: {
    me: () => request('/users/me'),
    update: (data: { prenom?: string; nom?: string; telephone?: string }) =>
      request('/users/me', { method: 'PUT', body: data }),
    deletePhoto: () => request('/users/me/photo', { method: 'DELETE' }),
  },

  comptes: {
    list: (mois?: number, annee?: number) => {
      let ep = '/comptes';
      if (mois !== undefined || annee !== undefined) {
        const params = new URLSearchParams();
        if (mois !== undefined) params.set('mois', String(mois));
        if (annee !== undefined) params.set('annee', String(annee));
        ep += `?${params.toString()}`;
      }
      return request(ep);
    },
    get: (id: number) => request(`/comptes/${id}`),
    create: (data: any) => request('/comptes', { method: 'POST', body: data }),
    update: (id: number, data: any) => request(`/comptes/${id}`, { method: 'PUT', body: data }),
    remove: (id: number) => request(`/comptes/${id}`, { method: 'DELETE' }),
  },

  categories: {
    list: () => request('/categories'),
    get: (id: number) => request(`/categories/${id}`),
    create: (data: any) => request('/categories', { method: 'POST', body: data }),
    update: (id: number, data: any) => request(`/categories/${id}`, { method: 'PUT', body: data }),
    remove: (id: number) => request(`/categories/${id}`, { method: 'DELETE' }),
    toggleQuotidien: (id: number) => request(`/categories/${id}/toggle-quotidien`, { method: 'POST' }),
  },

  revenus: {
    list: (params?: PeriodQuery) => request(`/revenus${buildPeriodQuery(params)}`),
    get: (id: number) => request(`/revenus/${id}`),
    create: (data: any) => request('/revenus', { method: 'POST', body: data }),
    update: (id: number, data: any) => request(`/revenus/${id}`, { method: 'PUT', body: data }),
    remove: (id: number) => request(`/revenus/${id}`, { method: 'DELETE' }),
  },

  depenses: {
    list: (params?: PeriodQuery) => request(`/depenses${buildPeriodQuery(params)}`),
    get: (id: number) => request(`/depenses/${id}`),
    create: (data: any) => request('/depenses', { method: 'POST', body: data }),
    update: (id: number, data: any) => request(`/depenses/${id}`, { method: 'PUT', body: data }),
    remove: (id: number) => request(`/depenses/${id}`, { method: 'DELETE' }),
  },

  budgets: {
    list: (params?: PeriodQuery) => request(`/budgets${buildPeriodQuery(params)}`),
    get: (id: number) => request(`/budgets/${id}`),
    create: (data: any) => request('/budgets', { method: 'POST', body: data }),
    update: (id: number, data: any) => request(`/budgets/${id}`, { method: 'PUT', body: data }),
    remove: (id: number) => request(`/budgets/${id}`, { method: 'DELETE' }),
  },

  objectifs: {
    list: () => request('/objectifs'),
    get: (id: number) => request(`/objectifs/${id}`),
    create: (data: any) => request('/objectifs', { method: 'POST', body: data }),
    update: (id: number, data: any) => request(`/objectifs/${id}`, { method: 'PUT', body: data }),
    remove: (id: number) => request(`/objectifs/${id}`, { method: 'DELETE' }),
    alimenter: (id: number, data: any) => request(`/objectifs/${id}/alimenter`, { method: 'POST', body: data }),
    alimentations: (id: number) => request(`/objectifs/${id}/alimentations`),
  },

  deviceTokens: {
    register: (token: string, plateforme: string) =>
      request('/device-tokens', { method: 'POST', body: { token, plateforme } }),
    remove: (token: string) =>
      request(`/device-tokens/${encodeURIComponent(token)}`, { method: 'DELETE' }),
  },

  uploadPhoto: async (uri: string) => {
    const token = _token;
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'photo.jpg';
    const ext = filename.split('.').pop() || 'jpg';
    formData.append('photo', {
      uri,
      name: filename,
      type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    } as any);
    const response = await fetch(`${API_BASE}/users/me/photo`, {
      method: 'PUT',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erreur upload');
    return data;
  },

  notifications: {
    list: () => request('/notifications'),
    nonLues: () => request('/notifications/non-lues'),
    create: (data: { type?: string; titre: string; message: string }) =>
      request('/notifications', { method: 'POST', body: data }),
    marquerLue: (id: number) => request(`/notifications/${id}/lire`, { method: 'PUT' }),
    toutLire: () => request('/notifications/tout-lire', { method: 'PUT' }),
    remove: (id: number) => request(`/notifications/${id}`, { method: 'DELETE' }),
  },

  analyseIa: {
    derniere: (mois?: number, annee?: number) => {
      let ep = '/analyse-ia/derniere';
      if (mois !== undefined || annee !== undefined) {
        const params = new URLSearchParams();
        if (mois !== undefined) params.set('mois', String(mois));
        if (annee !== undefined) params.set('annee', String(annee));
        ep += `?${params.toString()}`;
      }
      return request(ep);
    },
    generer: () => request('/analyse-ia/generer', { method: 'POST' }),
    analyserComplet: () => request('/analyse-ia/analyser-complet', { method: 'POST' }),
    historique: () => request('/analyse-ia/historique'),
    comparer: (mois1: number, annee1: number, mois2: number, annee2: number) =>
      request(`/analyse-ia/comparer?mois1=${mois1}&annee1=${annee1}&mois2=${mois2}&annee2=${annee2}`),
  },

  stats: {
    resume: (params?: PeriodQuery) => request(`/stats/resume${buildPeriodQuery(params)}`),
    repartition: (params?: PeriodQuery) => request(`/stats/repartition${buildPeriodQuery(params)}`),
    evolution: (mois?: number, annee?: number, refMois?: number) => {
      const params = new URLSearchParams();
      if (mois !== undefined) params.set('mois', String(mois));
      if (annee !== undefined) params.set('annee', String(annee));
      if (refMois !== undefined) params.set('ref_mois', String(refMois));
      const qs = params.toString();
      return request(`/stats/evolution${qs ? `?${qs}` : ''}`);
    },
    tendancesCategories: (mois?: number, annee?: number, refMois?: number) => {
      const params = new URLSearchParams();
      if (mois !== undefined) params.set('mois', String(mois));
      if (annee !== undefined) params.set('annee', String(annee));
      if (refMois !== undefined) params.set('ref_mois', String(refMois));
      const qs = params.toString();
      return request(`/stats/tendances-categories${qs ? `?${qs}` : ''}`);
    },
  },

  abonnements: {
    list: () => request('/abonnements'),
  },

  seuils: {
    list: () => request('/seuils'),
    create: (data: { categorie_id: number; montant_seuil: number; type?: string }) =>
      request('/seuils', { method: 'POST', body: data }),
    remove: (id: number) => request(`/seuils/${id}`, { method: 'DELETE' }),
    check: () => request('/seuils/check'),
  },

  archive: {
    periods: () => request('/archive/periods'),
    months: () => request('/archive/periods'),
    summary: (params?: PeriodQuery) => request(`/archive/summary${buildPeriodQuery(params)}`),
  },

  trends: {
    alertes: () => request('/trends/alertes'),
    recommandations: (categorieId: number) => request(`/trends/recommandations/${categorieId}`),
  },
};

export default api;
