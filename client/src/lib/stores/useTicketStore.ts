import { create } from 'zustand';

interface TicketStore {
    tickets: number;
    addTickets: (amount: number) => void;
    resetTickets: () => void;
}

export const useTicketStore = create<TicketStore>((set) => ({
    tickets: 0,
    addTickets: (amount) => set((state) => ({ tickets: state.tickets + amount })),
    resetTickets: () => set({ tickets: 0 }),
}));
