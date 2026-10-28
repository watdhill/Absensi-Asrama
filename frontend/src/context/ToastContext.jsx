import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CircleCheck, CircleX, X } from 'lucide-react';

const ToastContext = createContext(null);

// Notifikasi singkat di pojok kanan atas: toast.success('...') / toast.error('...')
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, message) => {
      const id = Date.now() + Math.random();
      setItems((list) => [...list, { id, type, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  const toast = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? (
              <CircleCheck size={20} color="var(--success)" />
            ) : (
              <CircleX size={20} color="var(--danger)" />
            )}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button className="input-action" style={{ position: 'static', transform: 'none', padding: 0 }} onClick={() => remove(t.id)} aria-label="Tutup">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
