import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LayoutDashboard,
  Users, 
  FileText, 
  Shield,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getLatestComplianceReport } from '@/lib/api';
import { getUserPlatformConnections, type UserPlatformConnection } from '@/lib/userPreferences';
import { getUserDisplayInfo } from '@/lib/userUtils';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string;
  badgeVariant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

const getSidebarItems = (criticalIssuesCount?: number): SidebarItem[] => [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'employees',
    label: 'Employees',
    icon: Users,
    path: '/dashboard/employees',
  },
  {
    id: 'contracts',
    label: 'Contracts',
    icon: FileText,
    path: '/dashboard/contracts',
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: Shield,
    path: '/dashboard/compliance',
    badge: criticalIssuesCount && criticalIssuesCount > 0 ? criticalIssuesCount.toString() : undefined,
    badgeVariant: 'destructive',
  },
  {
    id: 'knowledge-base',
    label: 'Knowledge Base',
    icon: MessageSquare,
    path: '/dashboard/knowledge-base',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/dashboard/analytics',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/dashboard/settings',
  },
];

interface DashboardState {
  criticalIssuesCount: number;
  connectedPlatforms: UserPlatformConnection[];
  isLoading: boolean;
  error: string | null;
}

interface SidebarContentProps {
  sidebarItems: SidebarItem[];
  activeItemId: string;
  navigate: (path: string) => void;
  closeSidebar: () => void;
}

const SidebarContent = memo<SidebarContentProps>(({ 
  sidebarItems, 
  activeItemId, 
  navigate, 
  closeSidebar 
}) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className="flex items-center gap-3 px-6 py-4 border-b">
      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
        <Shield className="w-5 h-5 text-white" />
      </div>
      <span className="text-xl font-bold">ComplyAI</span>
    </div>

    {/* Navigation */}
    <nav className="flex-1 px-4 py-6">
      <div className="space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItemId === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11",
                isActive && "bg-primary text-primary-foreground"
              )}
              onClick={() => {
                navigate(item.path);
                closeSidebar();
              }}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <Badge variant={item.badgeVariant || "default"} className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </nav>

    {/* User section */}
    <div className="px-4 py-4 border-t">
      <div className="flex items-center gap-3 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></div>
        <span className="text-muted-foreground">System Status: </span>
        <span className="text-green-600 font-medium">Operational</span>
      </div>
    </div>
  </div>
));

export default function MainDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    criticalIssuesCount: 0,
    connectedPlatforms: [],
    isLoading: true,
    error: null
  });
  
  const userInfo = useMemo(() => getUserDisplayInfo(user), [user]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setDashboardState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const [report, platforms] = await Promise.all([
          getLatestComplianceReport(),
          getUserPlatformConnections()
        ]);
        
        setDashboardState({
          criticalIssuesCount: report?.critical_issues || 0,
          connectedPlatforms: platforms.filter(p => p.connection_status === 'connected'),
          isLoading: false,
          error: null
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
        setDashboardState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
      }
    };

    loadData();
  }, []);

  const sidebarItems = useMemo(
    () => getSidebarItems(dashboardState.criticalIssuesCount),
    [dashboardState.criticalIssuesCount]
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const activeItemId = useMemo(() => {
    const currentPath = location.pathname;
    return sidebarItems.find(item => {
      if (item.path === '/dashboard' && currentPath === '/dashboard') {
        return true;
      }
      if (item.path !== '/dashboard' && currentPath.startsWith(item.path)) {
        return true;
      }
      return false;
    })?.id || 'overview';
  }, [location.pathname, sidebarItems]);


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-white border-r shadow-sm z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Main navigation"
      >
        <SidebarContent
          sidebarItems={sidebarItems}
          activeItemId={activeItemId}
          navigate={navigate}
          closeSidebar={closeSidebar}
        />
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={toggleSidebar}
                aria-label="Toggle navigation menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {sidebarItems.find(item => item.id === activeItemId)?.label || 'Dashboard'}
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500">
                    HR Compliance Management
                  </p>
                  {dashboardState.connectedPlatforms.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600 font-medium">
                          {dashboardState.connectedPlatforms[0].platform_name} Connected
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                <span 
                  className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                  aria-hidden="true"
                ></span>
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      {userInfo?.avatarUrl && (
                        <AvatarImage src={userInfo.avatarUrl} alt={userInfo.displayName} />
                      )}
                      <AvatarFallback>
                        {userInfo?.initials || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden md:block">
                      {userInfo?.displayName || user?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userInfo?.displayName || 'My Account'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}