import { LayoutDashboard, Map, Settings, Radio } from 'lucide-react';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'map', icon: <Map size={20} />, label: 'Map' },
  { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
];

interface SidebarProps {
  activeNav: string;
  onNavChange: (id: string) => void;
}

export function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  return (
    <aside className="w-16 bg-control-dark border-r border-control-border flex flex-col items-center py-4">
      <div className="mb-8">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-alert-critical to-alert-warning flex items-center justify-center">
          <Radio size={20} className="text-white" />
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavChange(item.id)}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200
              ${activeNav === item.id
                ? 'bg-control-surface text-alert-warning shadow-lg shadow-alert-warning/20'
                : 'text-control-muted hover:text-white hover:bg-control-surface/50'
              }
            `}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-control-border">
        <div className="w-8 h-8 rounded-full bg-control-surface flex items-center justify-center">
          <span className="text-xs font-medium text-control-muted">PA</span>
        </div>
      </div>
    </aside>
  );
}
