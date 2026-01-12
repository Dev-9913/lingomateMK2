import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("Lingomate-theme") || "night", // Default to 'night' theme if not set
  // This will ensure that the theme is set from localStorage on initial load`
  setTheme: (theme) => {
    localStorage.setItem("Lingomate-theme", theme);
    set({ theme });
  },
}));
