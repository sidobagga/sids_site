export default function HomePage() {
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Welcome 👋</h2>
      <p>
        I help teams turn messy data into clear, deployable insights—and I coach students &
        professionals to do the same. Grab a coffee, explore my work, and reach out if I can help.
      </p>
      <p className="mt-6">
        <a
          href="/resume.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-accent underline hover:no-underline"
        >
          📄 View My Resume →
        </a>
      </p>
    </section>
  )
}
