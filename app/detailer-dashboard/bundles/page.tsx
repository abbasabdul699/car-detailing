'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import ImageUploader from '../../components/ImageUploader';
import { useSession } from 'next-auth/react';

// Interfaces
interface Service {
  id: string;
  name: string;
  description: string;
  category: { id: string; name: string };
}

interface Bundle {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  services: { service: Service }[];
}

export default function ManageBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [bundlesRes, servicesRes] = await Promise.all([
          fetch('/api/detailer/bundles'),
          fetch('/api/detailer/services'), // Fetch detailer-specific services
        ]);

        if (!bundlesRes.ok) {
          const errorData = await bundlesRes.json();
          throw new Error(errorData.error || 'Failed to fetch bundles');
        }
        if (!servicesRes.ok) {
          const errorData = await servicesRes.json();
          throw new Error(errorData.error || 'Failed to fetch services list');
        }

        const bundlesData = await bundlesRes.json();
        const servicesData = await servicesRes.json();
        setBundles(bundlesData);
        setServices(servicesData);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleOpenModal = (bundle: Bundle | null = null) => {
    setEditingBundle(bundle);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBundle(null);
  };

  const handleSaveBundle = async (bundleData: any) => {
    const method = bundleData.id ? 'PUT' : 'POST';
    const url = bundleData.id ? `/api/detailer/bundles?id=${bundleData.id}` : '/api/detailer/bundles';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${bundleData.id ? 'update' : 'create'} bundle`);
      }
      
      const savedBundle = await response.json();

      if (bundleData.id) {
        setBundles(bundles.map(b => b.id === bundleData.id ? savedBundle : b));
      } else {
        setBundles([...bundles, savedBundle]);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      handleCloseModal();
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    if (!window.confirm("Are you sure you want to delete this bundle?")) {
      return;
    }

    try {
      const response = await fetch(`/api/detailer/bundles?id=${bundleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete bundle');
      }

      setBundles(bundles.filter(b => b.id !== bundleId));
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Bundles</h1>
          <button
            onClick={() => handleOpenModal()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
          >
            <FaPlus /> Create Bundle
          </button>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading && !error && (
            <BundlesTable bundles={bundles} onEdit={handleOpenModal} onDelete={handleDeleteBundle} />
          )}
        </div>
      </div>
      {isModalOpen && (
        <BundleFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveBundle}
          bundle={editingBundle}
          allServices={services}
        />
      )}
    </div>
  );
}

// Bundles Table Component
function BundlesTable({ bundles, onEdit, onDelete }: { bundles: Bundle[], onEdit: (bundle: Bundle) => void, onDelete: (bundleId: string) => void }) {
    if (bundles.length === 0) {
      return <div className="text-center text-gray-500 py-8">You haven't created any bundles yet.</div>;
    }
  
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b">
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">Price</th>
            <th className="text-left py-2">Included Services</th>
            <th className="text-left py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bundles.map((bundle) => (
            <tr key={bundle.id} className="border-t">
              <td className="py-3 font-medium">{bundle.name}</td>
              <td className="py-3">${bundle.price?.toFixed(2)}</td>
              <td className="py-3 text-gray-600">{bundle.services.map(s => s.service.name).join(', ')}</td>
              <td className="py-3 flex gap-2">
                <button onClick={() => onEdit(bundle)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs">Edit</button>
                <button onClick={() => onDelete(bundle.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
}
  
// Bundle Form Modal (a placeholder for now)
function BundleFormModal({ isOpen, onClose, onSave, bundle, allServices }: { isOpen: boolean, onClose: () => void, onSave: (data: any) => void, bundle: Bundle | null, allServices: Service[] }) {
    const { data: session } = useSession();
    const [name, setName] = useState(bundle?.name || '');
    const [description, setDescription] = useState(bundle?.description || '');
    const [price, setPrice] = useState(bundle?.price || '');
    const [imageUrl, setImageUrl] = useState(bundle?.imageUrl || '');
    const [selectedServices, setSelectedServices] = useState<string[]>(bundle?.services.map(s => s.service.id) || []);
    const [saving, setSaving] = useState(false);

    const handleServiceToggle = (serviceId: string) => {
        setSelectedServices(prev => 
            prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
        );
    };

    const handleImageUpload = (url: string) => {
      setImageUrl(url);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave({ id: bundle?.id, name, description, price: Number(price), serviceIds: selectedServices, imageUrl });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-3 right-3 text-2xl text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">&times;</button>
                <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">{bundle ? 'Edit Bundle' : 'Create New Bundle'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bundle Image</label>
                      <ImageUploader
                        onUpload={handleImageUpload}
                        businessName={(session?.user as any)?.businessName || 'bundle-image'}
                        detailerId={(session?.user as any)?.id}
                        type="bundle"
                        images={imageUrl ? [{ url: imageUrl, alt: name, type: 'bundle' }] : []}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bundle Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white" required />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg p-2 h-24 dark:bg-gray-800 dark:border-gray-700 dark:text-white"></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price</label>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white" required min="0" step="0.01" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Included Services</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-4 border rounded-lg dark:border-gray-700">
                            {allServices.map(service => (
                                <div key={service.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`service-${service.id}`}
                                        checked={selectedServices.includes(service.id)}
                                        onChange={() => handleServiceToggle(service.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor={`service-${service.id}`} className="ml-3 text-sm text-gray-700 dark:text-gray-300">{service.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Bundle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 