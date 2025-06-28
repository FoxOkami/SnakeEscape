import React from "react";
import SnakeRoom from "./components/Game/SnakeRoom";
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
  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-full h-screen bg-black overflow-hidden">
        <SnakeRoom />
      </div>
    </QueryClientProvider>
  );
}

export default App;
