// Helper untuk memanggil backend. Semua response backend berbentuk
// { success, data, ... } atau { success: false, message }, jadi di sini
// dikembalikan JSON-nya utuh, atau dilempar error berisi `message`.

const TOKEN_KEY = 'asrama_token';

// "Ingat saya" -> localStorage, selain itu sessionStorage (hilang saat tab ditutup)
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token, ingat) {
    try {
      (ingat ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch {
      // storage diblokir browser; login tetap berlaku sampai halaman di-refresh
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // abaikan
    }
  },
};

let memoryToken = null;
const getToken = () => memoryToken || tokenStore.get();
export const setMemoryToken = (t) => {
  memoryToken = t;
};

function buildUrl(path, query) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, v);
  });
  const qs = params.toString();
  return `/api${path}${qs ? `?${qs}` : ''}`;
}

async function request(path, { method = 'GET', body, query } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = body instanceof FormData;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Pastikan backend sudah berjalan.');
  }

  const json = await res.json().catch(() => ({ success: false, message: 'Server tidak merespons dengan benar' }));

  // token kadaluarsa / akun dinonaktifkan -> paksa logout
  if (res.status === 401 && path !== '/auth/login') {
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!res.ok || !json.success) throw new Error(json.message || 'Terjadi kesalahan');
  return json;
}

// File bukti butuh header Authorization, jadi tidak bisa langsung dipakai di <img src>.
// Diambil sebagai blob lalu dibuat object URL.
async function blob(path) {
  const res = await fetch(buildUrl(path), { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('File bukti tidak dapat dibuka');
  return res.blob();
}

export const api = {
  get: (path, query) => request(path, { query }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  blob,
};
