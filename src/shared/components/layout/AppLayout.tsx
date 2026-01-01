/**
 * App Layout Component - Main application layout wrapper
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import './AppLayout.css';

export const AppLayout: React.FC = () => {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

