export const metadata = { title: 'Coaching | Sid Bagga' }

export default function Coaching() {
  return (
    <section className="space-y-12">
      {/* Page header */}
      <header className="space-y-4">
        <h2 className="text-3xl font-semibold">Coaching & Tutoring</h2>
        <p className="text-gray-700 max-w-prose">
          Three evidence‑based pathways to higher grades, stronger mindsets, and fitter bodies. Transparent pricing, clear outcomes.
        </p>
      </header>

      {/* Offering cards - stacked vertically */}
      <div className="space-y-8">
        {/* Academic Tutoring - Most prominent */}
        <article className="rounded-2xl border bg-white p-8 shadow-md">
          <h3 className="text-3xl font-medium mb-2">Academic Tutoring</h3>
          <p className="text-base text-gray-600 mb-6">Calc AB/BC · AP Stats · AP English · APUSH · SAT/ACT</p>
          <p className="mb-6 text-lg">
            <span className="font-semibold">$110/hr</span> &nbsp;
            <span className="text-gray-500">(Reduced rate if you&rsquo;re experiencing need, or can barter something cool).</span>
          </p>
          <p className="mb-6 text-base">
            60+ students coached through a tutoring firm last year alone. Personal scores: SAT 1600, ACT 35, GRE 169Q.
          </p>
          <p className="text-gray-600">Mission: demystify tough subjects, prove that rigor ≠ misery.</p>
        </article>

        {/* Life Coaching - Secondary prominence */}
        <article className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-medium mb-1">Life Coaching</h3>
          <p className="text-sm text-gray-600 mb-4">Mindset • Habits • Decision‑making • All ages welcome</p>
          <p className="mb-4">
            30% of blocks I&rsquo;ve seen are cognitive distortions (availability, sunk cost, framing), 40% are subconscious emotional roadblocks, and the rest is plain hard work. I bring tools from psychodynamic therapy, IFS, and CBT to surface & solve them.
          </p>
          <p className="text-sm text-gray-600">Pilot program – inquire for custom rates while I gather case studies.</p>
        </article>

        {/* Athletics Coaching - Least prominent */}
        <article className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-medium mb-1">Athletics Coaching</h3>
          <p className="text-sm text-gray-600 mb-4">Running • Strength • Mobility</p>
          <p className="mb-4">
            Miramonte XC coach · sub‑3 marathoner. The biggest predictors of running success? High agency and life integration. I design bespoke training plans that respect both.
          </p>
          <p className="text-sm text-gray-600">Launching soon – join the waitlist.</p>
        </article>
      </div>
    </section>
  )
} 