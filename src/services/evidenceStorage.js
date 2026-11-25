const DATABASE_NAME = 'arena-evidence-demo'
const STORE_NAME = 'videos'
const DATABASE_VERSION = 1

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Local evidence storage is not supported in this browser.'))
      return
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open local evidence storage.'))
  })
}

export async function saveEvidence(file, evidenceId, onProgress = () => {}) {
  const database = await openDatabase()
  try {
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.min(85, Math.round(event.loaded / event.total * 85)))
      }
      reader.onerror = () => reject(reader.error || new Error('Could not read the selected video.'))
      reader.onabort = () => reject(new Error('Video reading was cancelled.'))
      reader.onload = () => resolve(reader.result)
      reader.readAsArrayBuffer(file)
    })
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put({
        blob: new Blob([data], { type: file.type || 'video/webm' }),
        name: file.name,
        type: file.type || 'video/webm',
        size: file.size,
        savedAt: new Date().toISOString(),
      }, evidenceId)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error || new Error('Could not save the video locally.'))
      transaction.onabort = () => reject(transaction.error || new Error('Local video save was cancelled.'))
    })
    onProgress(100)
    return evidenceId
  } finally {
    database.close()
  }
}

export async function getEvidence(evidenceId) {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(evidenceId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error || new Error('Could not retrieve local evidence.'))
    })
  } finally {
    database.close()
  }
}

export async function deleteEvidence(evidenceId) {
  const database = await openDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).delete(evidenceId)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error || new Error('Could not remove local evidence.'))
    })
  } finally {
    database.close()
  }
}
