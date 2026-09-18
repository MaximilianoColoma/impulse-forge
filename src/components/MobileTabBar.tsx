import { useNavigate, useLocation } from "react-router-dom";
import { Home, FolderKanban, Zap, LayoutDashboard, Lightbulb } from "lucide-react";

export function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: "stream", label: "Stream", icon: Home, path: "/app" },
    { id: "projects", label: "Projekte", icon: FolderKanban, path: "/projects" },
    { id: "blueprints", label: "Blueprints", icon: Lightbulb, path: "/blueprints" },
    { id: "sprint", label: "Sprint", icon: Zap, path: "/sprint" },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  ];

  const isActive = (path: string) => {
    if (path === "/app") return location.pathname === "/app";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all ${
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-6 w-6 ${active ? "scale-110" : ""}`} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}