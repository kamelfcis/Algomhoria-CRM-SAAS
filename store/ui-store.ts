import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

// Initialize sidebar state based on screen size
const getInitialSidebarState = () => {
  if (typeof window !== 'undefined') {
    return window.innerWidth >= 1024 // lg breakpoint
  }
  return true // Default to open for SSR
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: getInitialSidebarState(),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))

