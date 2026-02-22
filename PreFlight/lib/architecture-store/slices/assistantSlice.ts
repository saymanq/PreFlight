import { StateCreator } from "zustand";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  graphAction?: any;
}

export interface AssistantSlice {
  assistantMessages: AssistantMessage[];
  assistantSessionId: string | null;
  assistantLoading: boolean;
  addAssistantMessage: (msg: AssistantMessage) => void;
  setAssistantSessionId: (id: string | null) => void;
  setAssistantLoading: (loading: boolean) => void;
  clearAssistantMessages: () => void;
}

export const createAssistantSlice: StateCreator<AssistantSlice, [], [], AssistantSlice> = (set) => ({
  assistantMessages: [],
  assistantSessionId: null,
  assistantLoading: false,
  addAssistantMessage: (msg) =>
    set((state) => ({ assistantMessages: [...state.assistantMessages, msg] })),
  setAssistantSessionId: (id) => set({ assistantSessionId: id }),
  setAssistantLoading: (loading) => set({ assistantLoading: loading }),
  clearAssistantMessages: () => set({ assistantMessages: [], assistantSessionId: null }),
});
