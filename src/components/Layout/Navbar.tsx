/**
 * Top Navigation Bar Component
 * Minimal, compact, professional horizontal navbar for enterprise vitco
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authStore } from '@/store/authStore';
import { UserRole } from '@/types';
import './Navbar.css';

interface NavItem {
  label: string;
  path: string;
  roles?: string[]; // Optional: restrict to specific roles
  disabled?: boolean; // Future: disable for certain roles
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'Reports', path: '/reports' },
  { label: 'Reports', path: '/reports/admin', roles: ['admin'] },
  { label: 'Settings', path: '/settings' },
];

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = authStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [userMenuOpen]);

  const handleNavClick = (path: string) => {
    // If clicking Dashboard, navigate to role-specific dashboard
    if (path === '/dashboard') {
      const roleDashboard = getRoleDashboard();
      navigate(roleDashboard);
    } else {
      navigate(path);
    }
  };

  const handleLogoClick = () => {
    const roleDashboard = getRoleDashboard();
    navigate(roleDashboard);
  };

  const getRoleDashboard = (): string => {
    if (!user) return '/dashboard';
    
    const roleDashboards: Record<string, string> = {
      admin: '/admin',
      hr: '/hr',
      manager: '/manager',
      employee: '/employee',
    };
    
    return roleDashboards[user.role] || '/dashboard';
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const isActive = (path: string): boolean => {
    // For Dashboard, check if we're on any role-specific dashboard
    if (path === '/dashboard') {
      const roleDashboard = getRoleDashboard();
      return location.pathname === roleDashboard || 
             location.pathname === '/dashboard' ||
             (user && (
               (user.role === 'admin' && location.pathname === '/admin') ||
               (user.role === 'hr' && location.pathname === '/hr') ||
               (user.role === 'manager' && location.pathname === '/manager') ||
               (user.role === 'employee' && location.pathname === '/employee')
             ));
    }
    // For Reports, admin should see active when on /reports/admin
    if (path === '/reports') {
      if (user?.role === UserRole.ADMIN) {
        return location.pathname === '/reports/admin' || location.pathname.startsWith('/reports/admin');
      }
      return location.pathname === path || location.pathname.startsWith(path + '/');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Filter nav items based on role (future-ready)
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.disabled) return false;
    
    // Hide "Reports" for admin (they have "Admin Reports" instead)
    if (item.path === '/reports' && user?.role === UserRole.ADMIN) {
      return false;
    }
    
    if (item.roles && user) {
      return item.roles.includes(user.role);
    }
    return true; // Show all items if no role restriction
  });

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-container">
        {/* Left Section: Logo/App Name */}
        <div className="navbar-left">
          <button
            className="navbar-logo"
            onClick={handleLogoClick}
            aria-label="Go to Dashboard"
          >
            <img 
              src="./assets/logo.png" 
              alt="vitco Logo" 
              className="navbar-logo-img"
            />
          </button>
        </div>

        {/* Center Section: Navigation Items */}
        <div className="navbar-center">
          <ul className="navbar-nav" role="menubar">
            {visibleNavItems.map((item) => {
              const active = isActive(item.path);
              return (
                <li key={item.path} role="none">
                  <button
                    className={`navbar-nav-item ${active ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.path)}
                    aria-current={active ? 'page' : undefined}
                    role="menuitem"
                    disabled={item.disabled}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right Section: User Info & Menu */}
        <div className="navbar-right">
          <div className="navbar-user" ref={menuRef}>
            <button
              className="navbar-user-trigger"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              aria-label="User menu"
            >
              <div className="navbar-user-info">
                <span className="navbar-user-name">{user?.name}</span>
                <span className="navbar-user-role">{user?.role}</span>
              </div>
            </button>

            {userMenuOpen && (
              <div className="navbar-user-menu" role="menu">
                <button
                  className="navbar-menu-item"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/settings');
                  }}
                  role="menuitem"
                >
                  Settings
                </button>
                <button
                  className="navbar-menu-item"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

