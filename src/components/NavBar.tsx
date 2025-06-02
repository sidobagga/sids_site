'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/data-science', label: 'Data Science' },
  { href: '/coaching',     label: 'Coaching'     },
  { href: '/blog',         label: 'Blog'         }
]

export default function NavBar() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-6 py-4 font-medium">
      {links.map(({ href, label }) => (
        <Link key={href} href={href}
              className={`hover:underline underline-offset-4 ${pathname.startsWith(href) ? 'text-accent' : ''}`}>{label}</Link>
      ))}
    </nav>
  )
} 