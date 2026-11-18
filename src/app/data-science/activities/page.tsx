export const metadata = {
  title: 'Activities Explorer | Sid Bagga',
  description:
    'Interactive map and calendar views of personal training activities with spatial and temporal filtering.',
}

import { Suspense } from 'react'
import ActivitiesDashboard from './ActivitiesDashboard'

export default function ActivitiesPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-3xl font-semibold">Activities Explorer</h2>
        <p className="text-slate-600">
          Filter by map extent or calendar range to surface runs, rides, and adventures from more than a decade
          of training logs.
        </p>
      </header>
      <Suspense fallback={<p>Loading activities…</p>}>
        <ActivitiesDashboard />
      </Suspense>
    </section>
  )
}
