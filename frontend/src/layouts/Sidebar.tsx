import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Grid,
  Image,
  Video,
  FolderHeart,
  Star,
  Download,
  Trash2,
  Settings,
  Sparkles,
  Smartphone,
  HardDrive,
  Calendar,
  Copy,
  PieChart,
} from 'lucide-react';
import { useLibraryInfo } from '../hooks/useLibrary';
import { formatBytes } from '../utils/formatters';

export const Sidebar: React.FC = () => {
  const { data: lib } = useLibraryInfo();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard className='w-4 h-4' /> },
    { to: '/media', label: 'All Media', icon: <Grid className='w-4 h-4' /> },
    { to: '/photos', label: 'Photos', icon: <Image className='w-4 h-4' /> },
    { to: '/videos', label: 'Videos', icon: <Video className='w-4 h-4' /> },
    { to: '/timeline', label: 'Timeline', icon: <Calendar className='w-4 h-4' /> },
    { to: '/albums', label: 'Albums', icon: <FolderHeart className='w-4 h-4' /> },
    { to: '/favorites', label: 'Favorites', icon: <Star className='w-4 h-4' /> },
    { to: '/duplicates', label: 'Duplicates', icon: <Copy className='w-4 h-4' /> },
    { to: '/storage', label: 'Storage', icon: <PieChart className='w-4 h-4' /> },
    { to: '/import', label: 'Import Device', icon: <Download className='w-4 h-4' /> },
    { to: '/clean', label: 'Clean Mobile', icon: <Sparkles className='w-4 h-4' /> },
    { to: '/trash', label: 'Trash', icon: <Trash2 className='w-4 h-4' /> },
    { to: '/settings', label: 'Settings', icon: <Settings className='w-4 h-4' /> },
  ];

  return (
    <aside className='w-64 h-screen bg-[#12141C] border-r border-[#232736] flex flex-col justify-between p-4 select-none flex-shrink-0'>
      {/* Brand Header */}
      <div className='space-y-6'>
        <div className='flex items-center gap-3 px-2 pt-2'>
          <div className='w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2E7CF6] to-[#00D68F] flex items-center justify-center shadow-lg shadow-[#2E7CF6]/20'>
            <span className='font-black text-white text-sm tracking-wider'>M</span>
          </div>
          <div>
            <h1 className='text-sm font-bold tracking-tight text-white'>MEMEASY</h1>
            <span className='text-[10px] text-[#A0A6B8] block'>Local Media Platform</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className='space-y-1'>
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ' +
                (isActive
                  ? 'bg-[#2E7CF6] text-white shadow-md shadow-[#2E7CF6]/25 font-semibold'
                  : 'text-[#A0A6B8] hover:text-white hover:bg-[#1A1D28]')
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Library & Device Status Pill */}
      <div className='bg-[#1A1D28] p-3.5 rounded-2xl border border-[#232736] space-y-3'>
        <div className='flex items-center justify-between text-xs'>
          <span className='text-[#6B7280] flex items-center gap-1.5'>
            <HardDrive className='w-3.5 h-3.5 text-[#2E7CF6]' /> Storage
          </span>
          <span className='text-white font-medium text-[11px]'>
            {lib ? lib.formatted_free + ' free' : 'Loading...'}
          </span>
        </div>

        <div className='w-full bg-[#12141C] h-1.5 rounded-full overflow-hidden'>
          <div
            className='bg-[#2E7CF6] h-full'
            style={{
              width: lib && lib.total_bytes > 0 ? ((lib.total_bytes - lib.free_bytes) / lib.total_bytes) * 100 + '%' : '0%',
            }}
          />
        </div>

        <div className='flex items-center justify-between text-[11px] text-[#A0A6B8] pt-1 border-t border-[#232736]'>
          <span className='flex items-center gap-1.5'>
            <Smartphone className='w-3 h-3 text-[#00D68F]' /> iPhone Connected
          </span>
          <span className='text-[#00D68F] font-semibold'>Ready</span>
        </div>
      </div>
    </aside>
  );
};
