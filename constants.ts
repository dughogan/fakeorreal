
import { MediaItem } from './types';

// ==========================================
// ADMIN CONFIGURATION
// ==========================================
// All media is now loaded dynamically via the Admin Panel (Game Packs).
// This array is left empty to ensure no hardcoded external URLs are used.
// ==========================================

export const MEDIA_BASE_PATH = '/media/';

// Helper to automatically resolve paths. 
const getMediaUrl = (path: string) => {
  if (path.startsWith('http') || path.startsWith('https') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  return `${MEDIA_BASE_PATH}${path}`;
};

export const GAME_DURATION_SECONDS = 30;

// Default empty. Content must be uploaded via Admin -> Import Game Pack.
export const GAME_DATA: MediaItem[] = [];
