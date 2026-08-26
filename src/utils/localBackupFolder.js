const DB_NAME = 'captain-backup-local';
const STORE = 'handles';
const KEY = 'folder';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
  });
}

export async function saveLocalBackupFolder(handle) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getLocalBackupFolder() {
  const db = await openDb();
  const handle = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return handle || null;
}

export async function clearLocalBackupFolder() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function ensureLocalFolderPermission(handle) {
  if (!handle) return false;
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if ((await handle.requestPermission(opts)) === 'granted') return true;
  return false;
}

export async function saveBackupFileToLocalFolder(handle, fileName, blob) {
  const allowed = await ensureLocalFolderPermission(handle);
  if (!allowed) throw new Error('لم يتم السماح بالوصول لمجلد Windows');

  const fileHandle = await handle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export function supportsNativeFolderPicker() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickNativeBackupFolder() {
  if (!supportsNativeFolderPicker()) {
    throw new Error('المتصفح لا يدعم اختيار مجلد Windows — استخدم Chrome أو Edge');
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  await saveLocalBackupFolder(handle);
  return handle;
}
