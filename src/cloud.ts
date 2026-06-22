import { createClient } from '@supabase/supabase-js'
import type { FinanceData } from './types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const cloudConfigured = Boolean(url && key)
export const supabase = cloudConfigured ? createClient(url, key) : null

export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error('Облако не настроено')
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } })
  if (error) throw error
}

export async function pushCloud(data: FinanceData) {
  if (!supabase) throw new Error('Облако не настроено')
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Сначала войдите по email')
  const { error } = await supabase.from('finance_data').upsert({ user_id: auth.user.id, payload: data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function pullCloud(): Promise<FinanceData> {
  if (!supabase) throw new Error('Облако не настроено')
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Сначала войдите по email')
  const { data, error } = await supabase.from('finance_data').select('payload').eq('user_id', auth.user.id).single()
  if (error) throw error
  return data.payload as FinanceData
}
