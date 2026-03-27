import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeviceProvider } from "@/contexts/DeviceContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";

import Landing from "./pages/Landing";
import Play from "./pages/Play";
import HostLobby from "./pages/HostLobby";
import GameScreen from "./pages/GameScreen";
import ControllerView from "./pages/ControllerView";
import GameLibrary from "./pages/GameLibrary";
import Contribute from "./pages/Contribute";
import GameDetail from "./pages/GameDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Admin from "./pages/Admin";
import AdminReview from "./pages/AdminReview";
import AdminUsers from "./pages/AdminUsers";
import AdminLogs from "./pages/AdminLogs";
import AdminGames from "./pages/AdminGames";
import AdminSandbox from "./pages/AdminSandbox";
import NotFound from "./pages/NotFound";
import DeveloperDocs from "./pages/DeveloperDocs";
import WatchMode from "./pages/WatchMode";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DeviceProvider>
            <RealtimeProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                {/* Play routes */}
                <Route path="/play" element={<Play />} />
                <Route path="/host" element={<HostLobby />} />
                <Route path="/play/host" element={<HostLobby />} />
                <Route path="/join" element={<Play />} />
                <Route path="/join/:roomCode" element={<ControllerView />} />
                <Route path="/game/:roomCode" element={<GameScreen />} />
                {/* Legacy routes → redirect */}
                <Route path="/play/game/:roomCode" element={<GameScreen />} />
                <Route path="/play/controller/:roomCode" element={<ControllerView />} />
                {/* Library */}
                <Route path="/games" element={<GameLibrary />} />
                <Route path="/games/:gameId" element={<GameDetail />} />
                {/* Community */}
                <Route path="/contribute" element={<Contribute />} />
                <Route path="/developers" element={<DeveloperDocs />} />
                {/* Auth */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/signup" element={<Signup />} />
                {/* Admin */}
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/review" element={<AdminReview />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/logs" element={<AdminLogs />} />
                <Route path="/admin/games" element={<AdminGames />} />
                <Route path="/admin/sandbox/:gameId" element={<AdminSandbox />} />
                {/* Watch */}
                <Route path="/watch/:roomCode" element={<WatchMode />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RealtimeProvider>
          </DeviceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
