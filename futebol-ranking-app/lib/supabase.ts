import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Client só de servidor (Server Actions e Route Handlers), com a service role key.
// RLS fica ligado no banco sem policies: a anon key não lê nem grava nada.
// Nunca importar isto em código que roda no browser.

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})
