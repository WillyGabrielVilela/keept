import Link from 'next/link'
import { ArrowRight, CheckCircle2, XCircle, Heart } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <span className="font-semibold tracking-tight text-foreground">Keept</span>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/auth/register"
              className="text-sm bg-foreground text-background px-4 py-1.5 rounded-md hover:bg-foreground/90 transition-colors"
            >
              Começar
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground border border-border rounded-full px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            Responsabilidade pessoal com impacto social
          </div>

          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-foreground mb-6 leading-[1.1]">
            Mantenha<br />sua palavra.
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Transforme objetivos em compromissos reais. Quando você falha, sua
            consequência gera impacto positivo para uma causa que você escolheu.
          </p>

          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-lg font-medium hover:bg-foreground/90 transition-colors"
          >
            Criar minha conta
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-border">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest text-center mb-12">
            Como funciona
          </p>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Defina um objetivo',
                desc: 'Algo que realmente importa para você. Aprovação em concurso, perder peso, aprender um idioma.',
              },
              {
                step: '2',
                title: 'Crie compromissos',
                desc: 'Ações mensuráveis com metas claras. 20h de estudo por semana. 4 treinos. 300 questões.',
              },
              {
                step: '3',
                title: 'Escolha sua causa',
                desc: 'Se você falhar, o valor calculado é destinado a uma instituição que você acredita.',
              },
              {
                step: '4',
                title: 'Registre e evolua',
                desc: 'Registre seu progresso. O sistema calcula automaticamente o que foi cumprido.',
              },
            ].map((item) => (
              <div key={item.step} className="space-y-3">
                <div className="text-xs font-mono text-muted-foreground">{item.step.padStart(2, '0')}</div>
                <h3 className="font-medium text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example */}
      <section className="py-20 px-6 bg-secondary/40">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest text-center mb-10">
            Exemplo real
          </p>

          <div className="bg-white rounded-xl border border-border p-6 space-y-5">
            <div>
              <p className="text-xs text-muted-foreground mb-1">OBJETIVO</p>
              <p className="font-semibold text-lg">Aprovação na SEFAZ-PE</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Semana atual</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-2.5 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-sm">Horas de estudo</span>
                  </div>
                  <span className="text-sm text-muted-foreground">18 / 20h</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-sm">Questões resolvidas</span>
                  </div>
                  <span className="text-sm text-muted-foreground">280 / 300</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <XCircle className="w-4 h-4 text-consequence" />
                    <span className="text-sm">Simulado semanal</span>
                  </div>
                  <span className="text-sm text-muted-foreground">0 / 1</span>
                </div>
              </div>
            </div>

            <div className="bg-secondary/60 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-consequence" />
                <span className="text-sm text-muted-foreground">Impacto acumulado</span>
              </div>
              <span className="font-semibold text-foreground">R$ 14,00</span>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              "Você cumpriu 2 de 3 compromissos esta semana."
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="mx-auto max-w-lg space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">
            Seu objetivo exige compromisso.
          </h2>
          <p className="text-muted-foreground">
            Comece agora. Defina o que importa. Faça uma promessa para si mesmo.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-lg font-medium hover:bg-foreground/90 transition-colors"
          >
            Começar agora
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <span className="text-sm font-medium">Keept</span>
          <p className="text-xs text-muted-foreground">Promessas devem ser mantidas.</p>
        </div>
      </footer>
    </div>
  )
}
