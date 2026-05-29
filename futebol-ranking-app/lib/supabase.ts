import { createClient } from '@supabase/supabase-js'

const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
const key = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export const supabase = createClient(url, key)
