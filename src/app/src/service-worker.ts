export const serviceWorker = () => `
const DB_NAME = 'content-studio-media'
const STORE_NAME = 'drafts'

const DraftStatus = {
  Deleted: 'deleted',
  Created: 'created',
  Updated: 'updated',
  Pristine: 'pristine'
}

const mediaFileExtensions = [
  'png',
  'jpg',
  'jpeg',
  'svg',
  'webp',
  'ico',
  'gif',
]

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isSameDomain = url.origin === self.location.origin;

  if (!isSameDomain) {
    return event.respondWith(fetch(event.request));
  }

  if (url.pathname.startsWith('/_ipx/_/') || mediaFileExtensions.includes(url.pathname.split('.').pop())) {
    return event.respondWith(fetchFromIndexedDB(event, url));
  }

  event.respondWith(fetch(event.request))
})

function fetchFromIndexedDB(event, url) {
  console.log('Fetching from IndexedDB:', url.pathname);
  const dbKey = ['public-assets:', url.pathname.replace(/^\\/+(_ipx\\/_\\/)?/, '').replace('/', ':')].join('')
  return getData(dbKey).then(data => {
    if (!data) {
      console.log('No data found in IndexedDB:', url.pathname, dbKey);
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
