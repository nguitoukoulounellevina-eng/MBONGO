import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  bg: string;
  dark: string;
  purple: string;
  purpleL: string;
  purpleDark: string;
  white: string;
  surface: string;
  surfaceLight: string;
  border: string;
  text: string;
  muted: string;
  hint: string;
  green: string;
  danger: string;
  dangerLight: string;
  success: string;
  warning: string;
  blue: string;
  cardGreen: string;
  cardRed: string;
  info: string;
  iaPurple: string;
  iaBg: string;
  primary: string;
  icon: string;
};

type ThemeContextType = {
  mode: ThemeMode;
  primary: string;
  colors: ThemeColors;
  isDark: boolean;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  setPrimary: (color: string) => void;
};

export type ColorPreset = {
  key: string;
  label: string;
  labelEn: string;
  icon: string;
  main: string;
  light: string;
  dark: string;
};

export const COLOR_PRESETS: ColorPreset[] = [
  { key: 'purple', label: 'Violet', labelEn: 'Purple', icon: '💜', main: '#7C3AED', light: '#A78BFA', dark: '#5B21E6' },
  { key: 'blue', label: 'Bleu', labelEn: 'Blue', icon: '💙', main: '#3B82F6', light: '#93C5FD', dark: '#2563EB' },
  { key: 'green', label: 'Vert', labelEn: 'Green', icon: '💚', main: '#10B981', light: '#6EE7B7', dark: '#059669' },
  { key: 'orange', label: 'Orange', labelEn: 'Orange', icon: '🧡', main: '#F59E0B', light: '#FCD34D', dark: '#D97706' },
  { key: 'pink', label: 'Rose', labelEn: 'Pink', icon: '💗', main: '#EC4899', light: '#F9A8D4', dark: '#DB2777' },
  { key: 'red', label: 'Rouge', labelEn: 'Red', icon: '❤️', main: '#EF4444', light: '#FCA5A5', dark: '#DC2626' },
];

const STORAGE_KEY_MODE = 'theme_mode';
const STORAGE_KEY_PRIMARY = 'theme_primary';

const lightBase: Omit<ThemeColors, 'purple' | 'purpleL' | 'purpleDark' | 'primary'> = {
  bg: '#F8F7FF',
  dark: '#0D0828',
  white: '#FFFFFF',
  surface: '#F5F3FF',
  surfaceLight: '#F8F6FF',
  border: '#EDE9FE',
  text: '#1A153A',
  muted: '#5D5780',
  hint: '#9590B0',
  green: '#22C55E',
  danger: '#F43F5E',
  dangerLight: '#FFE4E8',
  success: '#22C55E',
  warning: '#F59E0B',
  blue: '#3B82F6',
  cardGreen: '#059669',
  cardRed: '#450A0A',
  info: '#33E1B7',
  iaPurple: '#8B5CF6',
  iaBg: '#F5F3FF',
  icon: '#9590B0',
};

const darkBase: Omit<ThemeColors, 'purple' | 'purpleL' | 'purpleDark' | 'primary'> = {
  bg: '#0F0B1F',
  dark: '#FFFFFF',
  white: '#1D163A',
  surface: '#251C49',
  surfaceLight: '#2D2156',
  border: 'rgba(255,255,255,0.06)',
  text: '#FFFFFF',
  muted: '#D5D2E8',
  hint: '#A29DBF',
  green: '#22C55E',
  danger: '#F43F5E',
  dangerLight: '#3D1422',
  success: '#22C55E',
  warning: '#F59E0B',
  blue: '#3B82F6',
  cardGreen: '#059669',
  cardRed: '#2D0B18',
  info: '#33E1B7',
  iaPurple: '#8B5CF6',
  iaBg: '#261A4A',
  icon: '#A29DBF',
};

function buildColors(mode: ThemeMode, preset: ColorPreset): ThemeColors {
  const base = mode === 'dark' ? darkBase : lightBase;
  return {
    ...base,
    purple: preset.main,
    purpleL: preset.light,
    purpleDark: preset.dark,
    primary: preset.main,
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [primary, setPrimaryState] = useState<string>('#7C3AED');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY_MODE).then((saved) => {
      if (saved === 'dark' || saved === 'light') {
        setModeState(saved);
      } else if (systemScheme === 'dark') {
        setModeState('dark');
      }
    }).catch(() => {
      if (systemScheme === 'dark') setModeState('dark');
    }).finally(() => setLoaded(true));

    SecureStore.getItemAsync(STORAGE_KEY_PRIMARY).then((saved) => {
      if (saved) { setPrimaryState(saved); }
    }).catch(() => {});
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      SecureStore.setItemAsync(STORAGE_KEY_MODE, next).catch(() => {});
      return next;
    });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    SecureStore.setItemAsync(STORAGE_KEY_MODE, newMode).catch(() => {});
  }, []);

  const setPrimary = useCallback((color: string) => {
    setPrimaryState(color);
    SecureStore.setItemAsync(STORAGE_KEY_PRIMARY, color).catch(() => {});
  }, []);

  const preset = useMemo(
    () => COLOR_PRESETS.find((p) => p.main === primary) ?? COLOR_PRESETS[0],
    [primary],
  );

  const colors = useMemo(() => buildColors(mode, preset), [mode, preset]);

  const value = useMemo(
    () => ({ mode, primary, colors, isDark: mode === 'dark', toggleMode, setMode, setPrimary }),
    [mode, primary, colors, toggleMode, setMode, setPrimary],
  );

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
