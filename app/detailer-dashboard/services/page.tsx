export default function ManageServicesPage() {
  // Mock services data
  const services = [
    {
      id: 1,
      name: 'Full Interior Detail',
      description: 'Deep clean of all interior surfaces, vacuum, shampoo, and protect.',
      price: '$120',
      category: 'Interior',
    },
    {
      id: 2,
      name: 'Exterior Wash & Wax',
      description: 'Hand wash, clay bar, and premium wax for a lasting shine.',
      price: '$80',
      category: 'Exterior',
    },
    {
      id: 3,
      name: 'Engine Bay Cleaning',
      description: 'Degrease and clean engine bay for a fresh look.',
      price: '$50',
      category: 'Additional',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Services</h1>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition">+ Add Service</button>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Description</th>
                <th className="text-left py-2">Category</th>
                <th className="text-left py-2">Price</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-t dark:border-gray-800">
                  <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{service.name}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-200">{service.description}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-200">{service.category}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-200">{service.price}</td>
                  <td className="py-2 flex gap-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Edit</button>
                    <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 