import ContactForm from './components/ContactForm';
import ResourceLinks from './components/ResourceLinks';

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-white relative">
      <div className="flex flex-col lg:flex-row">
        {/* Left Section */}
        <div className="lg:w-1/2 bg-[#E8F2EE] p-8 lg:p-16 lg:sticky lg:top-0">
          <div className="max-w-xl mx-auto">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Ready to transform your detailing business?
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Connect with our team to learn how Renu can help streamline your detailing operations and grow your business.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-[#0A2217] rounded-full flex items-center justify-center text-white">1</div>
                <div>
                  <h3 className="text-lg font-semibold">Schedule a Demo</h3>
                  <p className="text-gray-600">See how Renu can work for your business</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-[#0A2217] rounded-full flex items-center justify-center text-white">2</div>
                <div>
                  <h3 className="text-lg font-semibold">Customize Your Solution</h3>
                  <p className="text-gray-600">Get a plan that fits your needs</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-[#0A2217] rounded-full flex items-center justify-center text-white">3</div>
                <div>
                  <h3 className="text-lg font-semibold">Launch Your Success</h3>
                  <p className="text-gray-600">Start growing with Renu</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="lg:w-1/2 p-8 lg:p-16">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6">
              Talk with our team
            </h2>
            <p className="text-gray-600 mb-8">
              Fill out your information and a Renu representative will reach out to you. If you're looking for product support, visit our Help Center.
            </p>
            
            <ContactForm />
            <ResourceLinks />
          </div>
        </div>
      </div>
    </div>
  );
} 