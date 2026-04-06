export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function hasApiUrl(): boolean {
  return Boolean(API_URL);
}

export function buildApiUrl(path: string): string {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }
  return `${API_URL}${path}`;
}
