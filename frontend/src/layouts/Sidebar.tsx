import React, { useState } from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
} from '../components/icons';
import { useLibraryInfo } from '../hooks/useLibrary';
import { useCleanStatus } from '../hooks/useCleanMobile';
import { formatBytes } from '../utils/formatters';

export const Sidebar: React.FC = () => {
  const { data: lib } = useLibraryInfo();
  const { data: deviceStatus } = useCleanStatus();
  const [collapsed, setCollapsed] = useState(false);

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
    <aside
      className={'h-screen bg-[#12141C] border-r border-[#232736] flex flex-col justify-between p-4 select-none flex-shrink-0 transition-all duration-200 ' +
        (collapsed ? 'w-[68px] px-3' : 'w-64')}
    >
      {/* Brand Header */}
      <div className='space-y-6'>
        <div className={'flex items-center gap-3 pt-2 ' + (collapsed ? 'justify-center px-0' : 'px-2')}>
          <div className='w-8 h-8 rounded-xl bg-gradient-to-tr from-(--mm-accent) to-[#00D68F] flex items-center justify-center shadow-lg shadow-(--mm-accent)/20 flex-shrink-0'>
            <span className='font-black text-white text-sm tracking-wider'>M</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className='text-sm font-bold tracking-tight text-white'>MEMEASY</h1>
              <span className='text-[10px] text-[#A0A6B8] block'>Local Media Platform</span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className='space-y-1'>
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                'flex items-center rounded-xl text-xs font-medium transition-all ' +
                (collapsed ? 'justify-center p-2.5 ' : 'gap-3 px-3 py-2.5 ') +
                (isActive
                  ? 'bg-(--mm-accent) text-white shadow-md shadow-(--mm-accent)/25 font-semibold'
                  : 'text-[#A0A6B8] hover:text-white hover:bg-[#1A1D28]')
              }
            >
              {icon}
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Library & Device Status Pill */}
      <div className='space-y-3'>
        {!collapsed && (
          <div className='bg-[#1A1D28] p-3.5 rounded-2xl border border-[#232736] space-y-3'>
            <div className='flex items-center justify-between text-xs'>
              <span className='text-[#6B7280] flex items-center gap-1.5'>
                <HardDrive className='w-3.5 h-3.5 text-(--mm-accent)' /> Storage
              </span>
              <span className='text-white font-medium text-[11px]'>
                {lib ? lib.formatted_free + ' free' : 'Loading...'}
              </span>
            </div>

            <div className='w-full bg-[#12141C] h-1.5 rounded-full overflow-hidden'>
              <div
                className='bg-(--mm-accent) h-full'
                style={{
                  width: lib && lib.total_bytes > 0 ? ((lib.total_bytes - lib.free_bytes) / lib.total_bytes) * 100 + '%' : '0%',
                }}
              />
            </div>

            <div className='flex items-center justify-between text-[11px] text-[#A0A6B8] pt-1 border-t border-[#232736]'>
              {deviceStatus === undefined ? (
                <span className='h-3 w-full bg-[#12141C] rounded animate-pulse' />
              ) : deviceStatus.is_connected ? (
                <>
                  <span className='flex items-center gap-1.5 truncate'>
                    <Smartphone className='w-3 h-3 text-[#00D68F] flex-shrink-0' />
                    <span className='truncate'>{deviceStatus.name}</span>
                  </span>
                  <span className='text-[#00D68F] font-semibold flex-shrink-0'>Ready</span>
                </>
              ) : (
                <>
                  <span className='flex items-center gap-1.5'>
                    <Smartphone className='w-3 h-3 text-[#6B7280]' /> No device
                  </span>
                  <span className='text-[#6B7280] font-semibold'>USB</span>
                </>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className='w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#1A1D28] border border-[#232736] text-[#A0A6B8] hover:text-white hover:border-[#30354A] transition-all'
        >
          {collapsed ? <PanelLeftOpen className='w-4 h-4' /> : <PanelLeftClose className='w-4 h-4' />}
          {!collapsed && <span className='text-xs font-medium'>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};
