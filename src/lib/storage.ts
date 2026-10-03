/**
 * Browser storage keys, in one place.
 *
 * The app was called Habitloop before it was called HabitNow, and device-mode
 * accounts, habits, check-ins and preferences all live in localStorage under the
 * old name. Renaming the keys without moving the data would have quietly emptied
 * every existing install - the app would have looked brand new and the habits
 * would still have been sitting there under keys nothing read any more.
 *
 * So the rename carries the data with it, once, on first load.
 */

const PREFIX = 'habitnow'
const LEGACY_PREFIX = 'habitloop'

export const storageKey = (name: string) => `${PREFIX}.${name}`

/**
 * Copies anything still under the old prefix across, then removes it. Runs
 * before the app reads a single key. Safe to call repeatedly: a key that already
 * exists under the new prefix always wins, so a half-finished migration - a tab
 * closed mid-write, say - cannot overwrite newer data with older data.
 */
export function migrateLegacyStorage(): void {
  let storage: Storage
  try {
    storage = window.localStorage
  } catch {
    // Private mode or blocked site data: nothing to migrate, nothing to do.
    return
  }

  try {
    const stale: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith(`${LEGACY_PREFIX}.`)) stale.push(key)
    }
    if (stale.length === 0) return

    for (const key of stale) {
      const renamed = `${PREFIX}.${key.slice(LEGACY_PREFIX.length + 1)}`
      const value = storage.getItem(key)
      if (value !== null && storage.getItem(renamed) === null) {
        storage.setItem(renamed, value)
      }
      storage.removeItem(key)
    }
  } catch {
    // A quota failure mid-migration leaves the old keys in place, so the next
    // load tries again rather than losing anything.
  }
}
