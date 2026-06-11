import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left panel */}
      <div className="hidden md:flex flex-col justify-between bg-foreground text-background p-10">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          Keept
        </Link>

        <div className="space-y-4">
          <blockquote className="text-3xl font-medium leading-snug tracking-tight">
            "Transforme intenção<br />em ação."
          </blockquote>
          <p className="text-background/60 text-sm">
            Responsabilidade pessoal com impacto social.
          </p>
        </div>

        <p className="text-background/40 text-xs">
          Promessas devem ser mantidas.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              Keept
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
