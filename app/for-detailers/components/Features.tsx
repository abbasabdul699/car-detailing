import Image from 'next/image'
import Link from 'next/link'

export default function Features() {
  return (
    <section className="bg-[#DBF0E2] py-16">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-[#71A894] text-white rounded-full text-sm mb-4">
            How it works
          </span>
          <h2 className="text-4xl md:text-5xl font-serif mb-8">
            Get Set Up Fast With Our Help to<br />Start Growing
          </h2>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-8">
            <div className="aspect-square relative mb-6">
              <Image
                src="/images/schedule-call.png"
                alt="Schedule a Call"
                fill
                className="object-contain"
              />
            </div>
            <h3 className="text-2xl font-medium mb-4">Step 1. Schedule a Call</h3>
            <p className="text-gray-600">
              Chat with our team to understand your business, goals, and how we can help
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-8">
            <div className="aspect-square relative mb-6">
              <Image
                src="/images/build-profile.png"
                alt="Build Your Profile"
                fill
                className="object-contain"
              />
            </div>
            <h3 className="text-2xl font-medium mb-4">Step 2. We Build Your Profile</h3>
            <p className="text-gray-600">
              We create your profile with services, photos, and pricing—no website needed
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-8">
            <div className="aspect-square relative mb-6">
              <Image
                src="/images/get-customers.png"
                alt="Get Customers"
                fill
                className="object-contain"
              />
            </div>
            <h3 className="text-2xl font-medium mb-4">Step 3 – Get Customers</h3>
            <p className="text-gray-600">
              Your profile goes live, local customers find you, and you start booking jobs
            </p>
          </div>
        </div>


      </div>
    </section>
  )
}