// modules/db.js
const DB_NAME = 'MediaCenterDB';
const DB_VERSION = 2;
const STORES = {
    iranian: 'iranian_movies',
    foreign: 'foreign_movies'
};

let db = null;

function initDB() {
    return new Promise((resolve, reject) => {
        if (db && db.name === DB_NAME && db.version === DB_VERSION) {
            resolve(db);
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORES.iranian)) {
                db.createObjectStore(STORES.iranian, { keyPath: 'id' });
                console.log('استور ایرانی ساخته شد');
            }
            if (!db.objectStoreNames.contains(STORES.foreign)) {
                db.createObjectStore(STORES.foreign, { keyPath: 'id' });
                console.log('استور خارجی ساخته شد');
            }
        };
    });
}

async function loadMovies(storeName) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function saveMovie(storeName, movie) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(movie);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

async function deleteMovie(storeName, id) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}