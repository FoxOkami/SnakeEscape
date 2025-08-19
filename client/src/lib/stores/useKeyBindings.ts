import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface KeyBindings {
  up: string;
  down: string;
  left: string;
  right: string;
  interact: string;
  walking: string;
}

interface KeyBindingsStore {
  keyBindings: KeyBindings;
  setKeyBinding: (action: keyof KeyBindings, keyCode: string) => void;
  setAllKeyBindings: (bindings: KeyBindings) => void;
  resetToDefaults: () => void;
  getKeyDisplayText: (keyCode: string) => string;
}

const defaultKeyBindings: KeyBindings = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  interact: 'KeyE',
  walking: 'ControlLeft'
};

export const useKeyBindings = create<KeyBindingsStore>()(
  persist(
    (set, get) => ({
      keyBindings: defaultKeyBindings,

      setKeyBinding: (action: keyof KeyBindings, keyCode: string) => {
        set((state) => ({
          keyBindings: {
            ...state.keyBindings,
            [action]: keyCode
          }
        }));
      },

      setAllKeyBindings: (bindings: KeyBindings) => {
        set({ keyBindings: bindings });
      },

      resetToDefaults: () => {
        set({ keyBindings: { ...defaultKeyBindings } });
      },

      getKeyDisplayText: (keyCode: string): string => {
        const keyMap: { [key: string]: string } = {
          'ArrowUp': '↑',
          'ArrowDown': '↓', 
          'ArrowLeft': '←',
          'ArrowRight': '→',
          'KeyE': 'E',
          'KeyQ': 'Q',
          'KeyW': 'W',
          'KeyA': 'A',
          'KeyS': 'S',
          'KeyD': 'D',
          'ControlLeft': 'Ctrl',
          'ControlRight': 'Ctrl',
          'Space': 'Space',
          'ShiftLeft': 'Shift',
          'ShiftRight': 'Shift'
        };
        return keyMap[keyCode] || keyCode.replace('Key', '').replace('Arrow', '');
      }
    }),
    {
      name: 'snake-game-keybindings',
      version: 1
    }
  )
);