
import { MediaItem } from '../types';
import { GAME_DATA } from '../constants';
import JSZip from 'jszip';

const DB_NAME = 'RealOrAI_DB';
const STORE_NAME = 'custom_media';
const DB_VERSION = 1;

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// MIME Type Helpers
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

const getExtension = (mimeType: string | null, url: string, itemType: 'image' | 'video'): string => {
  if (mimeType) {
    const cleanMime = mimeType.split(';')[0].trim().toLowerCase();
    if (MIME_TO_EXT[cleanMime]) return MIME_TO_EXT[cleanMime];
    if (cleanMime.includes('jpeg') || cleanMime.includes('jpg')) return 'jpg';
    if (cleanMime.includes('png')) return 'png';
    if (cleanMime.includes('mp4')) return 'mp4';
  }
  return itemType === 'video' ? 'mp4' : 'jpg';
};

export const CustomContentManager = {
  async saveItem(item: MediaItem): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      // Ensure we mark it as custom when saving to DB
      const request = store.put({ ...item, isCustom: true });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Try to load a local manifest file (game_data.json) from the server root
  // This enables "Manual Install" mode where users just unzip to the folder.
  async loadLocalConfig(): Promise<MediaItem[]> {
    try {
        const response = await fetch('/game_data.json');
        if (!response.ok) return [];
        const data = await response.json();
        
        if (data.items && Array.isArray(data.items)) {
            console.log("Loaded local game_data.json");
            return data.items.map((item: MediaItem) => ({
                ...item,
                isCustom: true // Treat these as custom content so they appear in manage
            }));
        }
        return [];
    } catch (e) {
        // It's normal for this to fail if the file doesn't exist
        return [];
    }
  },

  async getAllItems(): Promise<MediaItem[]> {
    // 1. Load from IndexedDB (User Uploaded via Browser)
    const db = await openDB();
    const dbItems = await new Promise<MediaItem[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as MediaItem[]);
      request.onerror = () => reject(request.error);
    });

    // 2. Load from Local File System (Manual Install in root folder)
    const localItems = await this.loadLocalConfig();

    // 3. Merge, preferring DB items if IDs conflict
    const itemMap = new Map<string, MediaItem>();
    localItems.forEach(item => itemMap.set(item.id, item));
    dbItems.forEach(item => itemMap.set(item.id, item));

    return Array.from(itemMap.values());
  },

  async deleteItem(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async exportGamePack(): Promise<void> {
    try {
      // 1. Gather All Items (Custom Only)
      const allItems = await this.getAllItems();

      if (allItems.length === 0) {
         throw new Error("No items to export");
      }

      // 2. Prepare ZIP
      const zip = new JSZip();
      const mediaFolder = zip.folder("media");
      const processedItems: MediaItem[] = [];

      // 3. Process Items
      for (const item of allItems) {
        const itemCopy = { ...item };
        let blob: Blob | null = null;
        let mimeType: string | null = null;

        if (item.url.startsWith('data:')) {
            try {
                const res = await fetch(item.url);
                blob = await res.blob();
                mimeType = blob.type;
            } catch (e) {
                console.error(`Failed to process data URL for ${item.id}`, e);
            }
        } else if (item.url.startsWith('media/')) {
             // If it's already a relative path (from local install), try to fetch the file to bundle it
             try {
                const res = await fetch(item.url);
                blob = await res.blob();
                mimeType = blob.type;
             } catch (e) {
                console.error(`Failed to fetch local file ${item.url}`, e);
             }
        }
        
        // If we successfully got a blob, add to ZIP media folder
        if (blob && mediaFolder) {
            const ext = getExtension(mimeType, item.url, item.type);
            const filename = `${item.id}.${ext}`;
            
            // Store file in the 'media/' folder inside the zip
            mediaFolder.file(filename, blob);
            
            // Update manifest URL to point to this relative path
            // This works for both the importGamePack function AND if the user
            // extracts this zip to their root folder manually.
            itemCopy.url = `media/${filename}`;
        }
        
        processedItems.push(itemCopy);
      }

      // 4. Create Manifest named game_data.json (standard for local install)
      // We also include data.json for backward compatibility with the import function
      const exportData = {
        version: 1,
        timestamp: new Date().toISOString(),
        items: processedItems
      };
      
      const jsonStr = JSON.stringify(exportData, null, 2);
      zip.file("game_data.json", jsonStr); // For manual root install
      zip.file("data.json", jsonStr);      // For drag-and-drop import
      
      // 5. Generate and Download ZIP
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `real-or-ai-pack-${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Export failed:", error);
      throw error;
    }
  },

  async importGamePack(file: File): Promise<number> {
    try {
        const zip = await JSZip.loadAsync(file);
        
        // 1. Read Manifest (Try both names)
        let manifestFile = zip.file("data.json");
        if (!manifestFile) manifestFile = zip.file("game_data.json");

        if (!manifestFile) throw new Error("Invalid Game Pack: missing data.json or game_data.json");
        
        const manifestStr = await manifestFile.async("string");
        const manifest = JSON.parse(manifestStr);
        
        if (!manifest.items || !Array.isArray(manifest.items)) {
            throw new Error("Invalid Game Pack: corrupt data format");
        }

        let count = 0;

        // 2. Process and Save Items
        for (const item of manifest.items) {
            // Strictly check for files located in the media/ folder
            if (item.url.startsWith("media/")) {
                const relativePath = item.url; // e.g., "media/123.jpg"
                
                // Try to find the file using the exact path in the zip
                let mediaFile = zip.file(relativePath);
                
                if (mediaFile) {
                    const blob = await mediaFile.async("blob");
                    
                    // Convert to Base64 Data URL for storage in IndexedDB
                    // This "updates the DB appropriately" by simulating the file storage
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    
                    item.url = dataUrl;
                    await this.saveItem(item);
                    count++;
                } else {
                    console.warn(`File ${relativePath} referenced in manifest but not found in zip media folder.`);
                }
            } else if (item.url.startsWith("data:")) {
                // If it's already a data URL in the JSON (unlikely for proper packs, but possible)
                await this.saveItem(item);
                count++;
            }
        }

        return count;
    } catch (error) {
        console.error("Import failed:", error);
        throw error;
    }
  }
};
