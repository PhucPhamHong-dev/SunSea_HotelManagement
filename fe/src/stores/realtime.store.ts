import { create } from 'zustand';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface RealtimeState {
  status: ConnectionStatus;
  stale: boolean;
  setStatus: (status: ConnectionStatus) => void;
  setStale: (stale: boolean) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: 'disconnected',
  stale: false,
  setStatus: (status) => set({ status, stale: status !== 'connected' }),
  setStale: (stale) => set({ stale }),
}));
