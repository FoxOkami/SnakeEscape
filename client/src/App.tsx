import React from "react";
import SnakeRoom from "./components/Game/SnakeRoom";
import HubRoom from "./components/Hub/HubRoom";
import { useSnakeGame } from "./lib/stores/useSnakeGame";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource/inter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function App() {
  const { gameState } = useSnakeGame();
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-full h-screen bg-gray-900 overflow-hidden">
        {gameState === 'hub' ? <HubRoom /> : <SnakeRoom />}
      </div>
    </QueryClientProvider>
  );
}

export default App;
