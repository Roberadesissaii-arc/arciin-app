// Browser-safe base64 encoding
function base64Encode(str: string): string {
  if (typeof window !== 'undefined') {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  // Server-side fallback
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Browser-safe base64 decoding
function base64Decode(str: string): string {
  const base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  if (typeof window !== 'undefined') {
    return atob(base64);
  }
  // Server-side fallback
  return Buffer.from(base64, 'base64').toString('utf-8');
}

// Generate unique share ID
export function generateShareId(id: number, type: 'movie' | 'tv'): string {
  const data = `${type}-${id}`;
  return base64Encode(data);
}

// Decode share ID
export function decodeShareId(shareId: string): { type: 'movie' | 'tv'; id: number } | null {
  try {
    const decoded = base64Decode(shareId);
    const [type, id] = decoded.split('-');
    
    if ((type === 'movie' || type === 'tv') && !isNaN(Number(id))) {
      return { type, id: Number(id) };
    }
    return null;
  } catch {
    return null;
  }
}
