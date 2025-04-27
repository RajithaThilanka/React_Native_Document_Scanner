import React, { createContext, useState, useContext, useEffect } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  setDarkMode: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const deviceTheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load saved theme preference on app start
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await SecureStore.getItemAsync("theme_preference");

        if (savedTheme !== null) {
          // Use saved preference if it exists
          setIsDarkMode(savedTheme === "dark");
        } else {
          // Otherwise use device theme
          setIsDarkMode(deviceTheme === "dark");
        }
      } catch (error) {
        console.error("Error loading theme preference:", error);
        // Fallback to device theme
        setIsDarkMode(deviceTheme === "dark");
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, []);

  // Save theme preference whenever it changes
  useEffect(() => {
    if (!isLoading) {
      const saveThemePreference = async () => {
        try {
          await SecureStore.setItemAsync(
            "theme_preference",
            isDarkMode ? "dark" : "light"
          );
        } catch (error) {
          console.error("Error saving theme preference:", error);
        }
      };

      saveThemePreference();
    }
  }, [isDarkMode, isLoading]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const setDarkMode = (value: boolean) => {
    setIsDarkMode(value);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
