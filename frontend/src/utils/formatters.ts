export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(ms?: number | null): string {
  if (!ms || ms <= 0) return '';
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds === 0) return '0:01';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = seconds.toString().padStart(2, '0');
  if (hours > 0) {
    return hours + ':' + minutes.toString().padStart(2, '0') + ':' + ss;
  }
  return minutes + ':' + ss;
}

export function formatMonthSection(isoString?: string | null): string {
  if (!isoString) return 'Undated';
  try {
    const clean = isoString.replace(' ', 'T');
    const d = new Date(clean);
    if (isNaN(d.getTime())) return 'Undated';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
    });
  } catch {
    return 'Undated';
  }
}

export function formatDate(isoString?: string | null): string {
  if (!isoString) return 'Unknown date';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return 'Unknown date';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
