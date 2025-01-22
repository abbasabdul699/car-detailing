import { NavBar } from "@/app/components/nav-bar"
import { SearchForm } from "@/app/components/search-form"
import { ServiceCard } from "@/app/components/service-card"

const SERVICES = [
  { id: 1, title: "Lorem ipsum", rating: 4, imageUrl: "/placeholder.svg?height=400&width=600" },
  { id: 2, title: "Lorem ipsum", rating: 4, imageUrl: "/placeholder.svg?height=400&width=600" },
  { id: 3, title: "Lorem ipsum", rating: 4, imageUrl: "/placeholder.svg?height=400&width=600" },
  { id: 4, title: "Lorem ipsum", rating: 4, imageUrl: "/placeholder.svg?height=400&width=600" },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center mb-24">
          <h1 className="text-5xl font-serif mb-4 text-center">Book top-rated mobile car detailers</h1>
          <p className="text-gray-600 mb-8 text-center max-w-3xl">
            Lorem ipsum dolor sit amet consectetur lacus pharetra dolor vitae lectus id
          </p>
          <SearchForm />
        </div>

        <div>
          <h2 className="text-xl mb-6">Detailers in Bethpage, NY</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((service) => (
              <ServiceCard key={service.id} {...service} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
