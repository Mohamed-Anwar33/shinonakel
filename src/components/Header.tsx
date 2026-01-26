import { useState } from "react";
import { Menu } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import Sidebar from "./Sidebar";
const Header = () => {
  const {
    language
  } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return <>
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between flex-row-reverse">
          {/* Hamburger Menu Button - Top Right */}
          <button onClick={() => setIsSidebarOpen(true)} className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" aria-label="Menu">
            <Menu className="w-5 h-5 text-primary" />
          </button>

          {/* Logo/Title could go here in center if needed */}
          <div />

          {/* Empty space for balance */}
          <div className="w-10" />
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>;
};
export default Header;