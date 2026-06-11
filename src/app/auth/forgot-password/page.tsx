'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-2xl">
          ✉️
        </div>
        <h1 className="text-xl font-semibold">Verifique seu email</h1>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de recuperação para <strong>{email}</strong>.
        </p>
        <Link href="/auth/login" className="text-sm text-foreground font-medium hover:underline">
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">
          Enviaremos um link de recuperação para seu email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar link'}
        </Button>
      </form>

      <p className="text-sm text-center">
        <Link href="/auth/login" className="text-muted-foreground hover:text-foreground transition-colors">
          Voltar ao login
        </Link>
      </p>
    </div>
  )
}
