import { create } from "zustand";

type CommandState = {
  commandOpen: boolean;
  setCommandOpen: (value: boolean) => void;
};

export const useUiStore = create<CommandState>((set) => ({
  commandOpen: false,
  setCommandOpen: (value) => set({ commandOpen: value }),
}));