import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Buddy from "./Buddy";

const navItems = [
  { path: "/", label: "Home", icon: "buddy" },
  { path: "/roadmap", label: "My Path", icon: "🗺️" },
  { path: "/receipt", label: "Receipt", icon: "📸" },
  { path: "/badges", label: "Badges", icon: "🏅" },
];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md border-t border-border">
      <div className="max-w-[430px] mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 press-scale transition-colors ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {item.icon === "buddy" ? (
                <div className="w-7 h-7">
                  <Buddy size={28} mood={active ? "happy" : "idle"} />
                </div>
              ) : (
                <span className="text-xl">{item.icon}</span>
              )}
              <span className="text-[10px] font-body font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
