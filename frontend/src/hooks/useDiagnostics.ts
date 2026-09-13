import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { diagnosticsApi } from '../api/diagnosticsApi';

export function useDatabaseIntegrity() {
  return useQuery({
    queryKey: ['databaseIntegrity'],
    queryFn: () => diagnosticsApi.getIntegrity(),
  });
}

export function useDiagnosticsReport() {
  return useQuery({
    queryKey: ['diagnosticsReport'],
    queryFn: () => diagnosticsApi.getDiagnostics(),
  });
}

export function useBackupDatabase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => diagnosticsApi.backupDatabase(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databaseIntegrity'] });
    },
  });
}

export function useRestoreDatabase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (backupPath?: string) => diagnosticsApi.restoreDatabase(backupPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databaseIntegrity'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });
}

export function useCleanupThumbnails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => diagnosticsApi.cleanupThumbnails(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnosticsReport'] });
    },
  });
}
