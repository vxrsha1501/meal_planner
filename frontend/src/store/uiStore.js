import { create } from 'zustand';

const useUIStore = create((set) => ({
  viewMode: 'focused',
  glassIntensity: 'subtle',
  setViewMode: (viewMode) => set({ viewMode }),
  toggleViewMode: () => set((state) => ({
    viewMode: state.viewMode === 'focused' ? 'expanded' : 'focused',
  })),
  setGlassIntensity: (glassIntensity) => set({ glassIntensity }),
}));

export default useUIStore;
