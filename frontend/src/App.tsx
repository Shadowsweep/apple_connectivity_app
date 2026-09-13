import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './layouts/AppShell';
import { HomePage } from './pages/HomePage';
import { MediaPage } from './pages/MediaPage';
import { AlbumsPage } from './pages/AlbumsPage';
import { AlbumDetailPage } from './pages/AlbumDetailPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { ImportPage } from './pages/ImportPage';
import { CleanMobilePage } from './pages/CleanMobilePage';
import { TrashPage } from './pages/TrashPage';
import { SettingsPage } from './pages/SettingsPage';
import { BackendStatusModal } from './components/common/BackendStatusModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BackendStatusModal />
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path='media' element={<MediaPage initialType='ALL' />} />
            <Route path='photos' element={<MediaPage initialType='PHOTO' />} />
            <Route path='videos' element={<MediaPage initialType='VIDEO' />} />
            <Route path='albums' element={<AlbumsPage />} />
            <Route path='albums/:albumId' element={<AlbumDetailPage />} />
            <Route path='favorites' element={<FavoritesPage />} />
            <Route path='import' element={<ImportPage />} />
            <Route path='clean' element={<CleanMobilePage />} />
            <Route path='trash' element={<TrashPage />} />
            <Route path='settings' element={<SettingsPage />} />
            <Route path='*' element={<Navigate to='/' replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
