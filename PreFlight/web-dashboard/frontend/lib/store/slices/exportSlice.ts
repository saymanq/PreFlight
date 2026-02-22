import { StateCreator } from "zustand";

export interface ExportSlice {
  exportLoading: boolean;
  lastExportData: any | null;
  setExportLoading: (loading: boolean) => void;
  setLastExportData: (data: any) => void;
  clearExportData: () => void;
}

export const createExportSlice: StateCreator<ExportSlice, [], [], ExportSlice> = (set) => ({
  exportLoading: false,
  lastExportData: null,
  setExportLoading: (loading) => set({ exportLoading: loading }),
  setLastExportData: (data) => set({ lastExportData: data }),
  clearExportData: () => set({ lastExportData: null }),
});
