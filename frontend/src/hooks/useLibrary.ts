import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { libraryApi } from '../api/libraryApi';

export function useLibraryInfo() {
  return useQuery({
    queryKey: ['library'],
    queryFn: () => libraryApi.getLibrary(),
    staleTime: 30000,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => libraryApi.getHealth(),
    refetchInterval: 60000,
  });
}

export function useTriggerIndex() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => libraryApi.triggerIndex(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

export function useTriggerRebuild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => libraryApi.triggerRebuildIndex(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

export function useSetLibraryPath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => libraryApi.setLibraryPath(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });
}

export function useVaultFolders() {
  return useQuery({
    queryKey: ['vaultFolders'],
    queryFn: () => libraryApi.getVaultFolders(),
    staleTime: 5000,
  });
}

export function useCreateVaultFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, parent = '' }: { name: string; parent?: string }) =>
      libraryApi.createVaultFolder(name, parent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultFolders'] });
    },
  });
}

export function useMoveMediaToVaultFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      mediaIds,
      targetFolder = '',
      copyMedia = false,
    }: {
      mediaIds: string[];
      targetFolder?: string;
      copyMedia?: boolean;
    }) => libraryApi.moveMediaToVaultFolder(mediaIds, targetFolder, copyMedia),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['vaultFolders'] });
    },
  });
}
