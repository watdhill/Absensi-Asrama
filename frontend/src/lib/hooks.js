import { useCallback, useEffect, useRef, useState } from 'react';

// Ambil data dari API. Data lama tetap ditampilkan selama reload supaya
// tabel tidak berkedip saat filter berubah.
export function useFetch(fetcher, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((res) => alive && setState({ data: res, loading: false, error: null }))
      .catch((err) => alive && setState((s) => ({ ...s, loading: false, error: err.message })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

export function useClickOutside(ref, onOutside, active = true) {
  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside, active]);
}

// Nilai yang baru berubah setelah pengguna berhenti mengetik
export function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// Detik yang sudah berlalu sejak `since` berubah, diperbarui tiap detik
export function useElapsed(since) {
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(Date.now());
  useEffect(() => {
    start.current = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [since]);
  return elapsed;
}
