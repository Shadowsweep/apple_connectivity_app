import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const AppShell: React.FC = () => {
  const location = useLocation();

  const getTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard Overview';
      case '/media':
        return 'All Media';
      case '/photos':
        return 'Photos';
      case '/videos':
        return 'Videos';
      case '/albums':
        return 'Virtual Albums';
      case '/favorites':
        return 'Starred Favorites';
      case '/import':
        return 'iPhone Import Wizard';
      case '/clean':
        return 'Clean Mobile Review';
      case '/trash':
        return 'Trash';
      case '/settings':
        return 'Settings & Diagnostics';
      default:
        return 'MEMEASY Vault';
    }
  };

  return (
    <div className='flex h-screen w-screen overflow-hidden bg-[#090A0F] text-white'>
      <Sidebar />
      <div className='flex-1 flex flex-col h-full overflow-hidden'>
        <TopBar title={getTitle()} />
        <main className='flex-1 overflow-y-auto p-8'>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
