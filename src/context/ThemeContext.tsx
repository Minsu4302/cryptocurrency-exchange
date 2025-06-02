'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light-theme' | 'dark-theme';

const ThemeContext = createContext<{
    theme: Theme;
    toggleTheme: () => void;
}>({
    theme: 'light-theme',
    toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<Theme>('light-theme');

    useEffect(() => {
        const saved = (localStorage.getItem('theme') as Theme) || 'light-theme';
        setTheme(saved);
        document.body.id = saved;
    }, []);

    const toggleTheme = () => {
        const next = theme === 'light-theme' ? 'dark-theme' : 'light-theme';
        setTheme(next);
        localStorage.setItem('theme', next);
        document.body.id = next;
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
