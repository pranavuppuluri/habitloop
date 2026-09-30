import { localBackend } from './local'
import { cloudConfigured, supabaseBackend } from './supabase'
import type { Backend } from './types'

/**
 * One switch decides where data lives. With Supabase keys present at build
 * time the app uses real accounts that sync; without them it falls back to
 * device-only accounts so a fresh clone works with zero setup.
 */
export const backend: Backend = cloudConfigured ? supabaseBackend : localBackend
export { cloudConfigured }
export type { Backend }
