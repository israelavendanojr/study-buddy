import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Onboarding from "./pages/Onboarding";
import GoalTuning from "./pages/GoalTuning";
import Roadmap from "./pages/Roadmap";
import Receipt from "./pages/Receipt";
import BadgeBoard from "./pages/BadgeBoard";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const showNav = ["/roadmap", "/receipt", "/badges", "/"].includes(location.pathname);
  const isOnboarding = location.pathname === "/" || location.pathname === "/onboarding" || location.pathname === "/tuning";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen relative">
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/tuning" element={<GoalTuning />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/receipt" element={<Receipt />} />
        <Route path="/badges" element={<BadgeBoard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isOnboarding && showNav && <BottomNav />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
