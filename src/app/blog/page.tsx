import Link from 'next/link'

export const metadata = { title: 'Blog | Sid Bagga' }

export default function Blog() {
  // TODO: List markdown posts once MDX pipeline is wired.
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Blog</h2>
      <p>Thoughts on running, cognition, and data will appear here.</p>
      <p className="mt-6">
        <Link href="https://www.strava.com/athletes/6308986" className="text-accent underline">
          Follow my runs on Strava →
        </Link>
      </p>
    </section>
  )
} 