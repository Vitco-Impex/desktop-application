/**
 * Navbar Component - Minimal, compact navigation bar
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authStore } from '@/store/authStore';
import { companyStore } from '@/store/companyStore';
import { UserRole } from '@/types';
import './Navbar.css';

interface NavItem {
  label: string;
  path: string;
  roles?: string[];
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'Reports', path: '/reports' },
  { label: 'Reports', path: '/reports/admin', roles: ['admin'] },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Settings', path: '/settings' },
];

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = authStore();
  const { company } = companyStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleNavClick = (path: string) => {
    if (path === '/dashboard') {
      navigate(getRoleDashboard());
    } else {
      navigate(path);
    }
  };

  const handleLogoClick = () => {
    navigate(getRoleDashboard());
  };

  const isActive = (path: string): boolean => {
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
    if (path === '/reports') {
      if (user?.role === UserRole.ADMIN) {
        return location.pathname === '/reports/admin' || location.pathname.startsWith('/reports/admin');
      }
      return location.pathname === path || location.pathname.startsWith(path + '/');
    }
    if (path === '/calendar') {
      return location.pathname === path || location.pathname.startsWith(path + '/');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.disabled) return false;
    if (item.path === '/reports' && user?.role === UserRole.ADMIN) {
      return false;
    }
    if (item.roles && user) {
      return item.roles.includes(user.role);
    }
    return true;
  });

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-container">
        <div className="navbar-left">
          <button
            className="navbar-logo"
            onClick={handleLogoClick}
            aria-label="Go to Dashboard"
          >
            {company?.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={`${company.displayName || 'Company OS'} Logo`}
                className="navbar-logo-img"
              />
            ) : (
              <img
                src="./assets/logo.png"
                alt="Company OS Logo"
                className="navbar-logo-img"
              />
            )}
          </button>
        </div>

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
                <span className="navbar-user-name">
                  {company?.displayName || 'Company OS'}
                </span>
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
                {(user?.role === UserRole.ADMIN || user?.role === 'admin') && (
                  <button
                    className="navbar-menu-item"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

