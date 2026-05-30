'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

const SESSION_KEY = 'fr_autenticado'
const SENHA = (process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'admin123').replace(/^﻿/, '').trim()

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [autenticado, setAutenticado] = useState(false)
  const [verificado, setVerificado] = useState(false)
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(false)

  useEffect(() => {
    setAutenticado(sessionStorage.getItem(SESSION_KEY) === '1')
    setVerificado(true)
  }, [])

  if (!verificado) return null

  if (autenticado) return <>{children}</>

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (senha === SENHA) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setAutenticado(true)
    } else {
      setErro(true)
      setSenha('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-card-bg border border-dourado/30 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-xl font-bold text-dourado mb-1">Área Restrita</h2>
        <p className="text-verde-claro text-sm mb-6">Digite a senha para continuar</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            autoFocus
            onChange={(e) => { setSenha(e.target.value); setErro(false) }}
            className={`w-full bg-black/30 border rounded-lg px-4 py-3 text-texto text-center tracking-widest outline-none transition-colors
              ${erro ? 'border-red-500' : 'border-white/10 focus:border-dourado'}`}
          />
          {erro && <p className="text-red-400 text-sm">Senha incorreta. Tente novamente.</p>}
          <button
            type="submit"
            className="w-full bg-verde-campo hover:bg-verde-medio border border-dourado text-dourado font-bold py-3 rounded-lg transition-colors cursor-pointer"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full bg-transparent border border-white/15 text-verde-claro hover:text-texto hover:border-white/30 font-semibold py-3 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  )
}
