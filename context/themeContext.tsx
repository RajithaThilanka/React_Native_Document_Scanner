// context/themeContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Appearance } from "react-native";

type Theme = "light" | "dark";

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  primary: string;
  primaryDark: string;
  accent: string;
  danger: string;
  dangerBg: string;
  statusBar: string;
  headerBg: string;
  headerText: string;
}

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProviderCustom = ({ children }: { children: ReactNode }) => {
  const systemTheme = Appearance.getColorScheme() as Theme;
  const [theme, setTheme] = useState<Theme>(systemTheme ?? "light");
  const [manualTheme, setManualTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(colorScheme as Theme);
    });
    return () => subscription.remove();
  }, []);

  const toggleTheme = () => {
    const newTheme = (theme === "dark" ? "light" : "dark") as Theme;
    setTheme(newTheme);
    setManualTheme(newTheme);
  };

  const colors: ThemeColors =
    theme === "dark"
      ? {
          background: "bg-gray-900",
          card: "bg-gray-800",
          text: "text-white",
          subtext: "text-gray-400",
          border: "border-gray-700",
          primary: "bg-blue-600",
          primaryDark: "bg-blue-800",
          accent: "bg-green-600",
          danger: "text-red-400",
          dangerBg: "bg-red-900 bg-opacity-30",
          statusBar: "#1f2937",
          headerBg: "bg-gray-800",
          headerText: "text-white",
        }
      : {
          background: "bg-gray-50",
          card: "bg-white",
          text: "text-gray-800",
          subtext: "text-gray-500",
          border: "border-gray-200",
          primary: "bg-blue-600",
          primaryDark: "bg-blue-800",
          accent: "bg-green-600",
          danger: "text-red-500",
          dangerBg: "bg-red-50",
          statusBar: "#2563eb",
          headerBg: "bg-blue-800",
          headerText: "text-white",
        };

  const value = {
    theme,
    isDarkMode: theme === "dark",
    toggleTheme,
    colors,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("useThemeContext must be used inside ThemeProviderCustom");
  return context;
};
