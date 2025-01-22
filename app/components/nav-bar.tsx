import Link from "next/link"

export function NavBar() {
  return (
    <nav className="flex items-center justify-between py-6 px-4 max-w-7xl mx-auto">
      <Link href="/" className="text-xl font-semibold">
        Squeakify
      </Link>
      <div className="flex items-center gap-8">
        <Link href="/blog" className="text-gray-600 hover:text-gray-900">
          Blog
        </Link>
        <Link href="/about" className="text-gray-600 hover:text-gray-900">
          About us
        </Link>
        <Link href="/detailers" className="px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300">
          For detailers
        </Link>
      </div>
    </nav>
  )
}

