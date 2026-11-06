import { useEffect, useState } from 'react';
import { FiSun, FiMoon, FiMonitor} from 'react-icons/fi';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [systemDark, setSystemDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const root = document.documentElement;
    const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = (e) => {
      setSystemDark(e.matches);
      if (theme === 'system') {
        root.classList.toggle('dark', e.matches);
      }
    };

    systemQuery.addListener(handleSystemChange);
    
    // Apply initial theme
    if (theme === 'dark' || (theme === 'system' && systemDark)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);

    return () => systemQuery.removeListener(handleSystemChange);
  }, [theme, systemDark]);

  return (
    <div className="space-y-0.5 px-0.5 py-0.5">
      <div className="flex justify-between space-x-0.5 bg-muted p-1.5 rounded-xl">
        <button
          onClick={() => setTheme('light')}
          className={`flex flex-col items-center p-1 rounded-lg transition-all ${
            theme === 'light'
              ? 'bg-primary text-white shadow-xs'
              : 'text-foreground hover:bg-accent'
          }`}
        >
          <FiSun className="w-3 h-3" />
        </button>

        <button
          onClick={() => setTheme('dark')}
          className={`flex flex-col items-center p-1 rounded-lg transition-all ${
            theme === 'dark'
              ? 'bg-primary text-white shadow-xs'
              : 'text-foreground hover:bg-accent'
          }`}
        >
          <FiMoon className="w-3 h-3" />
        </button>

        <button
          onClick={() => setTheme('system')}
          className={`flex flex-col items-center p-1 rounded-lg transition-all ${
            theme === 'system'
              ? 'bg-primary text-white shadow-xs'
              : 'text-foreground hover:bg-accent'
          }`}
        >
          <FiMonitor className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default ThemeToggle; 