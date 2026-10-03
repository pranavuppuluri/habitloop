/**
 * The rename migration.
 *
 * This is the one piece of the Habitloop -> HabitNow rename that could destroy
 * data rather than just look wrong, so it gets its own tests.
 */
import { beforeEach, expect, test } from 'vitest'
import { migrateLegacyStorage, storageKey } from './storage'

beforeEach(() => localStorage.clear())

test('keys are namespaced under the new name', () => {
  expect(storageKey('theme')).toBe('habitnow.theme')
})

test('pre-rename data is carried across and the old key removed', () => {
  localStorage.setItem('habitloop.users.v1', '{"a@b.com":{"id":"u1"}}')
  localStorage.setItem('habitloop.session.v1', 'u1')
  localStorage.setItem('habitloop.data.v1.u1', '{"habits":[{"id":"h1"}]}')

  migrateLegacyStorage()

  expect(localStorage.getItem('habitnow.users.v1')).toBe('{"a@b.com":{"id":"u1"}}')
  expect(localStorage.getItem('habitnow.session.v1')).toBe('u1')
  expect(localStorage.getItem('habitnow.data.v1.u1')).toBe('{"habits":[{"id":"h1"}]}')
  expect(localStorage.getItem('habitloop.users.v1')).toBeNull()
})

test('newer data always wins over a leftover old key', () => {
  localStorage.setItem('habitloop.theme', 'light')
  localStorage.setItem('habitnow.theme', 'dark')

  migrateLegacyStorage()

  // The post-rename value survives; the stale one is cleared, not promoted.
  expect(localStorage.getItem('habitnow.theme')).toBe('dark')
  expect(localStorage.getItem('habitloop.theme')).toBeNull()
})

test('running it twice changes nothing the second time', () => {
  localStorage.setItem('habitloop.session.v1', 'u1')
  migrateLegacyStorage()
  migrateLegacyStorage()
  expect(localStorage.getItem('habitnow.session.v1')).toBe('u1')
})

test('unrelated keys are left alone', () => {
  localStorage.setItem('somethingelse.theme', 'x')
  migrateLegacyStorage()
  expect(localStorage.getItem('somethingelse.theme')).toBe('x')
})

test('it is a no-op on a fresh install', () => {
  migrateLegacyStorage()
  expect(localStorage.length).toBe(0)
})
