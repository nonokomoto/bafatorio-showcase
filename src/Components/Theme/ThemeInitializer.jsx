import { useEffect } from 'react';

/**
 * Componente responsável por inicializar o tema da aplicação.
 * Deve ser incluído no topo da hierarquia de componentes para garantir
 * que o tema seja aplicado em toda a aplicação.
 */
const ThemeInitializer = () => {
  useEffect(() => {
    // Inicializa o tema
    const initializeTheme = () => {
      const root = document.documentElement;
      const savedTheme = localStorage.getItem('theme') || 'system';
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Aplica o tema baseado na preferência salva ou do sistema
      if (savedTheme === 'dark' || (savedTheme === 'system' && systemPrefersDark)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    // Adiciona listener para mudanças na preferência do sistema
    const handleSystemThemeChange = (e) => {
      const savedTheme = localStorage.getItem('theme') || 'system';
      if (savedTheme === 'system') {
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };

    // Inicializa o tema
    initializeTheme();

    // Adiciona listener para mudanças na preferência do sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Cleanup na desmontagem do componente
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Este componente não renderiza nada visualmente
  return null;
};

export default ThemeInitializer;
