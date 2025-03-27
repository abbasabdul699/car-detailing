'use client';
import { useState, useEffect } from 'react';
import { Service } from '@prisma/client';

interface ServicesSectionProps {
  initialServices?: Service[];
}

export default function ServicesSection({ initialServices = [] }: ServicesSectionProps) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [isAddingService, setIsAddingService] = useState(false);
  const [error, setError] = useState('');
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: '',
    duration: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch services when component mounts
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/detailers/services');
        if (!response.ok) {
          throw new Error('Failed to fetch services');
        }
        const data = await response.json();
        setServices(data);
      } catch (err) {
        setError('Failed to load services');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newService.name) {
        setError('Service name is required');
        return;
      }

      const price = newService.price === '' ? 0 : parseFloat(newService.price);
      if (isNaN(price)) {
        setError('Please enter a valid price');
        return;
      }

      const duration = newService.duration === '' ? '' : newService.duration.toString();

      const serviceData = {
        name: newService.name,
        description: newService.description,
        price: price,
        duration: duration
      };

      const response = await fetch('/api/detailers/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        throw new Error('Failed to add service');
      }

      const addedService = await response.json();
      setServices([...services, addedService]);
      setIsAddingService(false);
      setNewService({ name: '', description: '', price: '', duration: '' });
      setError('');
    } catch (err) {
      setError('Failed to add service');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'price' && value !== '') {
      if (!/^\d*\.?\d*$/.test(value)) return;
    }
    
    if (name === 'duration' && value !== '') {
      if (!/^\d*$/.test(value)) return;
    }

    setNewService(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      const response = await fetch(`/api/detailers/services/${serviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete service');
      }

      setServices(services.filter(service => service.id !== serviceId));
    } catch (error) {
      setError('Failed to delete service');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Services</h2>
        <button
          onClick={() => setIsAddingService(true)}
          className="px-4 py-2 bg-[#389167] text-white rounded-lg hover:bg-[#1D503A] transition-colors"
        >
          Add New Service
        </button>
      </div>

      {error && (
        <div className="mb-4 text-red-500">{error}</div>
      )}

      {isLoading ? (
        <p>Loading services...</p>
      ) : services.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No services added yet. Click "Add New Service" to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {services.map((service) => (
            <div key={service.id} className="border p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="text-gray-600">{service.description}</p>
                  <div className="mt-2">
                    <span className="text-green-600 font-medium">
                      ${service.price.toFixed(2)}
                    </span>
                    <span className="text-gray-500 ml-4">
                      {service.duration} minutes
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteService(service.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Service Form */}
      {isAddingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Add New Service</h3>
            <form onSubmit={handleAddService}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Service Name
                  </label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={handleInputChange}
                    name="name"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={newService.description}
                    onChange={handleInputChange}
                    name="description"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price ($)
                    </label>
                    <input
                      type="text"
                      value={newService.price}
                      onChange={handleInputChange}
                      name="price"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Duration (minutes)
                    </label>
                    <input
                      type="text"
                      value={newService.duration}
                      onChange={handleInputChange}
                      name="duration"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingService(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add Service
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 