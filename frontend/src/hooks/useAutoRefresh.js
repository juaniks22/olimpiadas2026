import { useEffect, useRef } from 'react';

const DEFAULT_INTERVAL_MS = 15000;

/**
 * Auto-refresh: llama a `fn` cada `intervalMs`.
 *  - Pausa mientras la pestaña no está visible; al volver a estarlo, refresca al instante.
 *  - No encola: si la corrida anterior sigue en curso, saltea el tick.
 *  - `fn` se guarda en un ref, así que no hace falta que sea estable (useCallback opcional).
 *
 * Pensado para refrescos "silenciosos" de listas: `fn` NO debería tocar flags de loading
 * ni resetear paginación.
 */
export default function useAutoRefresh(fn, intervalMs = DEFAULT_INTERVAL_MS, enabled = true) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let running = false;

    const tick = async () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        await fnRef.current?.();
      } catch (err) {
        console.error('[auto-refresh]', err);
      } finally {
        running = false;
      }
    };

    const id = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, enabled]);
}
