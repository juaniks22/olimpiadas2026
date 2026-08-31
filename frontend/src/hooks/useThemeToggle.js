import { useCallback, useEffect, useState } from 'react';

// Tema claro/oscuro con persistencia independiente por rol (Admin / Genérico).
// Cada layout pasa su propia storageKey y su tema por defecto, así el
// toggle de un rol no pisa la preferencia guardada del otro en el mismo
// navegador (Admin arranca oscuro, Genérico arranca claro; ambos pueden
// cambiarlo y el sistema lo recuerda la próxima vez que entren).
export function useThemeToggle(storageKey, defaultTheme = 'light') {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return defaultTheme;
    const stored = window.localStorage.getItem(storageKey);
    return stored === 'light' || stored === 'dark' ? stored : defaultTheme;
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    window.localStorage.setItem(storageKey, theme);

    // Al desmontar el layout (logout o cambio de sección) se limpia el
    // atributo para que el próximo layout que monte aplique su propio tema.
    return () => document.documentElement.removeAttribute('data-theme');
  }, [theme, storageKey]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}