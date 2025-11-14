export const serviceWorker = () => `
const DB_NAME = 'studio-media'
const STORE_NAME = 'drafts'

const DraftStatus = {
  Deleted: 'deleted',
  Created: 'created',
  Updated: 'updated',
  Pristine: 'pristine'
}

const IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'svg',
  'webp',
  'ico',
  'gif',
]

function extractImagePath(url) {
  const pathname = url.pathname;
  if (pathname.startsWith('/_ipx/_/')) {
    return pathname.replace('/_ipx/_', '')
  }

  if (pathname.startsWith('/_vercel/image')) {
    return url.searchParams.get('url') || null
  }

  if (IMAGE_EXTENSIONS.includes(pathname.split('.').pop())) {
    return pathname
  }

  return null
}

self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isSameDomain = url.origin === self.location.origin;

  if (!isSameDomain) {
    return event.respondWith(fetch(event.request));
  }

  const imageUrl = extractImagePath(url);
  if (imageUrl) {
    return event.respondWith(fetchFromIndexedDB(event, imageUrl));
  }

  event.respondWith(fetch(event.request))
})

function fetchFromIndexedDB(event, url) {
  const dbKey = url.replace(/^\\//g, '').replace(/\\//g, ':')
  return getData(dbKey).then(data => {
    if (!data) {
      return fetch(event.request);
    }

    const dbItem = JSON.parse(data)

    console.log('Data found in IndexedDB:', dbItem);

    // Deleted file
    if (dbItem.status === DraftStatus.Deleted) {
      return fetch('https://placehold.co/1200x800?text=Deleted');
    }

    // Renamed file
    if (dbItem.original?.path) {
      return fetch(dbItem.original.path);
    }

    // Created file
    const parsed = parseDataUrl(dbItem.modified.raw);
    const bytes = base64ToUint8Array(parsed.base64);

    return new Response(bytes, {
      headers: { 'Content-Type': parsed.mime }
    });
  })
}

function parseDataUrl(dataUrl) {
  // Example: data:image/png;base64,iVBORw0KG...
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  return {
    mime: match[1],
    base64: match[2]
  };
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

// Read data from the object store
function getData(key) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const store = tx.objectStore('drafts');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}
`
