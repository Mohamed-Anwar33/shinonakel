import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import CompleteProfilePrompt from "@/components/CompleteProfilePrompt";
import Index from "./pages/Index";
import Results from "./pages/Results";
import RestaurantDetailPage from "./pages/RestaurantDetail";
import Welcome from "./pages/Welcome";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import MyList from "./pages/MyList";
import Friends from "./pages/Friends";
import UserProfile from "./pages/UserProfile";
import Admin from "./pages/Admin";
import Statistics from "./pages/Statistics";
import Contact from "./pages/Contact";
import Map from "./pages/Map";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Legal from "./pages/Legal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CompleteProfilePrompt />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/results" element={<Results />} />
              <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/my-list" element={<MyList />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/user/:username" element={<UserProfile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/map" element={<Map />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
