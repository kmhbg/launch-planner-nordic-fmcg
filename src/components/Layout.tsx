import React from 'react';
import { useStore } from '../store/store';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { viewMode, setViewMode, currentUser } = useStore();

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="logo">Launch Planner</h1>
            <p className="tagline">Nordic FMCG</p>
          </div>
          <nav className="nav">
            <button
              className={viewMode === 'dashboard' ? 'active' : ''}
              onClick={() => setViewMode('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={viewMode === 'sales' ? 'active' : ''}
              onClick={() => setViewMode('sales')}
            >
              Sälj
            </button>
            <button
              className={viewMode === 'timeline' ? 'active' : ''}
              onClick={() => setViewMode('timeline')}
            >
              Tidslinje
            </button>
            {currentUser?.role === 'admin' && (
              <button
                className={viewMode === 'settings' ? 'active' : ''}
                onClick={() => setViewMode('settings')}
              >
                Inställningar
              </button>
            )}
          </nav>
          {currentUser && (
            <div className="user-info">
              <span>{currentUser.name}</span>
              {currentUser.role === 'admin' && (
                <span className="badge info">Admin</span>
              )}
            </div>
          )}
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
};

