export function isDeterministic(): boolean {
  if (typeof window !== 'undefined' && (window as any).__MK_DETERMINISTIC === true) {
    return true;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('deterministic') === '1';
  } catch {
    return false;
  }
}

export function getDiagnosticsScene(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('scene') === 'diagnostics' ? 'diagnostics' : null;
  } catch {
    return null;
  }
}

export function getReplayFile(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('replay');
  } catch {
    return null;
  }
}
