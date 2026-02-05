'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { FaArrowUp, FaArrowDown, FaSort, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import ImageUploader from '../../components/ImageUploader';
import IconUploader from '@/app/components/IconUploader';

// Interfaces
interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  icon?: string;
  categoryId?: string;
  category?: { id: string; name: string };
  basePrice?: number;
  priceRange?: string;
  duration?: number;
}

interface Bundle {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  services: { service: Service }[];
}

function ManageServicesPageInner() {
  const [services, setServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [detailerId, setDetailerId] = useState<string | undefined>(undefined);
  const [businessName, setBusinessName] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'bundles'>('services');
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceModalError, setServiceModalError] = useState<string | null>(null);
  const [isCreateServiceModalOpen, setIsCreateServiceModalOpen] = useState(false);

  useEffect(() => {
    async function fetchDetailerData() {
      setLoading(true);
      setError(null);
      try {
        const [servicesRes, bundlesRes, profileRes] = await Promise.all([
          fetch('/api/detailer/services'),
          fetch('/api/detailer/bundles'),
          fetch('/api/detailer/profile')
        ]);

        if (!servicesRes.ok) {
          if (servicesRes.status === 401) throw new Error('You must be logged in to view your services.');
          if (servicesRes.status === 404) throw new Error('No detailer profile found. Please complete your profile.');
          throw new Error('Failed to fetch services');
        }

        if (!bundlesRes.ok) {
          const errorData = await bundlesRes.json();
          throw new Error(errorData.error || 'Failed to fetch bundles');
        }

        const servicesData = await servicesRes.json();
        const bundlesData = await bundlesRes.json();
        const profileData = await profileRes.json();
        setServices(Array.isArray(servicesData) ? servicesData : []);
        setBundles(bundlesData);
        if (profileRes.ok) {
          setDetailerId(profileData?.id);
          setBusinessName(profileData?.businessName);
        }
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    async function fetchCatalogData() {
      try {
        const [catalogRes, categoriesRes] = await Promise.all([
          fetch('/api/services'),
          fetch('/api/categories')
        ]);
        const catalogData = await catalogRes.json();
        const categoriesData = await categoriesRes.json();
        setAllServices(Array.isArray(catalogData) ? catalogData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } catch (err: any) {
        setServiceModalError(err.message || 'Failed to load service catalog');
      }
    }

    fetchDetailerData();
    fetchCatalogData();
  }, []);

  const refreshDetailerServices = async () => {
    try {
      const res = await fetch('/api/detailer/services');
      if (!res.ok) {
        throw new Error('Failed to fetch services');
      }
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh services');
    }
  };

  const refreshCatalog = async () => {
    try {
      const [catalogRes, categoriesRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/categories')
      ]);
      const catalogData = await catalogRes.json();
      const categoriesData = await categoriesRes.json();
      setAllServices(Array.isArray(catalogData) ? catalogData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err: any) {
      setServiceModalError(err.message || 'Failed to refresh service catalog');
    }
  };

  const sortedServices = useMemo(() => {
    let sortableServices = [...services];
    if (sortConfig !== null) {
      sortableServices.sort((a, b) => {
        const aValue = sortConfig.key === 'category' ? a.category?.name : a[sortConfig.key];
        const bValue = sortConfig.key === 'category' ? b.category?.name : b[sortConfig.key];

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableServices;
  }, [services, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <FaSort className="inline-block h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'ascending' ? <FaArrowUp className="inline-block h-4 w-4" /> : <FaArrowDown className="inline-block h-4 w-4" />;
  };

  // Bundle management functions
  const handleOpenBundleModal = (bundle: Bundle | null = null) => {
    setEditingBundle(bundle);
    setIsBundleModalOpen(true);
  };

  const handleCloseBundleModal = () => {
    setIsBundleModalOpen(false);
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
      handleCloseBundleModal();
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

  const handleOpenAddServiceModal = () => {
    setServiceModalError(null);
    setIsCreateServiceModalOpen(true);
  };

  const handleOpenEditServiceModal = (service: Service) => {
    setServiceModalError(null);
    setEditingService(service);
    setIsEditServiceModalOpen(true);
  };

  const handleCloseEditServiceModal = () => {
    setIsEditServiceModalOpen(false);
    setEditingService(null);
  };

  const handleCreateService = async (form: {
    name: string;
    description: string;
    icon: string;
    categoryId?: string;
    basePrice?: string;
    priceRange?: string;
    duration?: string;
  }) => {
    setServiceModalError(null);
    try {
      const createRes = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create service');
      }

      const assignRes = await fetch('/api/detailer/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: createData.id }),
      });
      const assignData = await assignRes.json();
      if (!assignRes.ok) {
        throw new Error(assignData.error || 'Failed to assign service');
      }

      await Promise.all([refreshCatalog(), refreshDetailerServices()]);
      setIsCreateServiceModalOpen(false);
    } catch (err: any) {
      setServiceModalError(err.message || 'Failed to create service');
    }
  };

  const handleSaveServiceEdit = async (updated: {
    id: string;
    name: string;
    description: string;
    icon: string;
    categoryId?: string;
    basePrice?: string;
    priceRange?: string;
    duration?: string;
  }) => {
    setServiceModalError(null);
    try {
      const res = await fetch(`/api/services/${updated.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update service');
      }
      await Promise.all([refreshCatalog(), refreshDetailerServices()]);
      handleCloseEditServiceModal();
    } catch (err: any) {
      setServiceModalError(err.message || 'Failed to update service');
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    if (!window.confirm('Remove this service from your list?')) {
      return;
    }
    try {
      const res = await fetch('/api/detailer/services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove service');
      }
      await refreshDetailerServices();
    } catch (err: any) {
      setServiceModalError(err.message || 'Failed to remove service');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Services & Bundles</h1>
          <div className="flex gap-2">
            {activeTab === 'services' && (
              <button
                onClick={handleOpenAddServiceModal}
                className="bg-black text-white px-4 py-2 rounded-full font-semibold hover:bg-gray-800 transition"
              >
                + Create Service
              </button>
            )}
            {activeTab === 'bundles' && (
              <button
                onClick={() => handleOpenBundleModal()}
                className="bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition flex items-center gap-2"
              >
                <FaPlus /> Create Bundle
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'services'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab('bundles')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'bundles'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Bundles
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div>Loading...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <>
                {serviceModalError && (
                  <div className="text-red-600 mb-4">{serviceModalError}</div>
                )}
                {activeTab === 'services' && (
                  <ServicesTable 
                    services={sortedServices} 
                    requestSort={requestSort} 
                    getSortIcon={getSortIcon}
                    onEdit={handleOpenEditServiceModal}
                    onDelete={handleRemoveService}
                  />
                )}
                {activeTab === 'bundles' && (
                  <BundlesTable 
                    bundles={bundles} 
                    onEdit={handleOpenBundleModal} 
                    onDelete={handleDeleteBundle} 
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bundle Modal */}
      {isBundleModalOpen && (
        <BundleFormModal
          isOpen={isBundleModalOpen}
          onClose={handleCloseBundleModal}
          onSave={handleSaveBundle}
          bundle={editingBundle}
          allServices={services}
          detailerId={detailerId}
          businessName={businessName}
        />
      )}

      {/* Create Service Modal */}
      {isCreateServiceModalOpen && (
        <CreateServiceModal
          isOpen={isCreateServiceModalOpen}
          onClose={() => setIsCreateServiceModalOpen(false)}
          onSave={handleCreateService}
          categories={categories}
          error={serviceModalError}
        />
      )}

      {/* Edit Service Modal */}
      {isEditServiceModalOpen && (
        <EditServiceModal
          isOpen={isEditServiceModalOpen}
          onClose={handleCloseEditServiceModal}
          onSave={handleSaveServiceEdit}
          service={editingService}
          categories={categories}
          error={serviceModalError}
        />
      )}
    </div>
  );
}

export default function ManageServicesPage() {
  return <ManageServicesPageInner />;
}

// Services Table Component
function ServicesTable({ services, requestSort, getSortIcon, onEdit, onDelete }: { 
  services: Service[], 
  requestSort: (key: string) => void, 
  getSortIcon: (key: string) => React.ReactNode,
  onEdit: (service: Service) => void,
  onDelete: (serviceId: string) => void
}) {
  if (services.length === 0) {
    return <div className="text-gray-500">No services found. Click "+ Add Service" to create your first service.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-gray-500 border-b">
          <th className="text-left py-2 cursor-pointer" onClick={() => requestSort('name')}>
            <div className="flex items-center gap-2">
              <span>Name</span>
              {getSortIcon('name')}
            </div>
          </th>
          <th className="text-left py-2">Description</th>
          <th className="text-left py-2 cursor-pointer" onClick={() => requestSort('category')}>
            <div className="flex items-center gap-2">
              <span>Category</span>
              {getSortIcon('category')}
            </div>
          </th>
          <th className="text-left py-2">Price</th>
          <th className="text-left py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {services.map((service) => (
          <tr key={service.id} className="border-t">
            <td className="py-2 font-medium text-gray-900">{service.name}</td>
            <td className="py-2 text-gray-700">{service.description}</td>
            <td className="py-2 text-gray-700">{service.category?.name}</td>
            <td className="py-2 text-gray-700">
              {service.priceRange ? service.priceRange : service.basePrice ? `$${service.basePrice}` : '—'}
            </td>
            <td className="py-2 flex gap-2">
              <button
                onClick={() => onEdit(service)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(service.id)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Bundles Table Component
function BundlesTable({ bundles, onEdit, onDelete }: { 
  bundles: Bundle[], 
  onEdit: (bundle: Bundle) => void, 
  onDelete: (bundleId: string) => void 
}) {
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
            <td className="py-3 font-medium text-gray-900">{bundle.name}</td>
            <td className="py-3 text-gray-700">${bundle.price?.toFixed(2)}</td>
            <td className="py-3 text-gray-700">{bundle.services.map(s => s.service.name).join(', ')}</td>
            <td className="py-3 flex gap-2">
              <button 
                onClick={() => onEdit(bundle)} 
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs transition"
              >
                <FaEdit className="inline mr-1" /> Edit
              </button>
              <button 
                onClick={() => onDelete(bundle.id)} 
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs transition"
              >
                <FaTrash className="inline mr-1" /> Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CreateServiceModal({
  isOpen,
  onClose,
  onSave,
  categories,
  error
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    icon: string;
    categoryId?: string;
    basePrice?: string;
    priceRange?: string;
    duration?: string;
  }) => void;
  categories: Category[];
  error: string | null;
}) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: '',
    categoryId: '',
    basePrice: '',
    priceRange: '',
    duration: ''
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: '',
      description: '',
      icon: '',
      categoryId: categories[0]?.id || '',
      basePrice: '',
      priceRange: '',
      duration: ''
    });
  }, [isOpen, categories]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 text-2xl text-gray-500 hover:text-gray-800 transition-colors">&times;</button>
        <h2 className="text-xl font-bold mb-4 text-gray-900">Create Service</h2>
        {error && <div className="text-red-600 mb-3">{error}</div>}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon (SVG)</label>
            <IconUploader onUpload={(url) => setForm(prev => ({ ...prev, icon: url }))} />
            {form.icon && (
              <div className="mt-2">
                <img src={form.icon} alt="Service icon" className="w-12 h-12 object-contain border rounded" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border rounded-lg p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border rounded-lg p-2 h-24"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.categoryId}
              onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value }))}
              className="w-full border rounded-lg p-2"
            >
              {categories.length === 0 && <option value="">Uncategorized</option>}
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
              <input
                type="number"
                value={form.basePrice}
                onChange={e => setForm(prev => ({ ...prev, basePrice: e.target.value }))}
                className="w-full border rounded-lg p-2"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
              <input
                value={form.priceRange}
                onChange={e => setForm(prev => ({ ...prev, priceRange: e.target.value }))}
                className="w-full border rounded-lg p-2"
                placeholder="$50-75"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
              <input
                type="number"
                value={form.duration}
                onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full border rounded-lg p-2"
                min="0"
                step="1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
            <button
              type="button"
              onClick={() => onSave(form)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              disabled={!form.name.trim()}
            >
              Create Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditServiceModal({
  isOpen,
  onClose,
  onSave,
  service,
  categories,
  error
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id: string;
    name: string;
    description: string;
    icon: string;
    categoryId?: string;
    basePrice?: string;
    priceRange?: string;
    duration?: string;
  }) => void;
  service: Service | null;
  categories: Category[];
  error: string | null;
}) {
  const [form, setForm] = useState({
    id: '',
    name: '',
    description: '',
    icon: '',
    categoryId: '',
    basePrice: '',
    priceRange: '',
    duration: ''
  });

  useEffect(() => {
    if (!isOpen || !service) return;
    setForm({
      id: service.id,
      name: service.name || '',
      description: service.description || '',
      icon: service.icon || '',
      categoryId: service.categoryId || '',
      basePrice: service.basePrice?.toString() || '',
      priceRange: service.priceRange || '',
      duration: service.duration?.toString() || ''
    });
  }, [isOpen, service]);

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 text-2xl text-gray-500 hover:text-gray-800 transition-colors">&times;</button>
        <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Service</h2>
        {error && <div className="text-red-600 mb-3">{error}</div>}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon (SVG)</label>
            <IconUploader onUpload={(url) => setForm(prev => ({ ...prev, icon: url }))} />
            {form.icon && (
              <div className="mt-2">
                <img src={form.icon} alt="Service icon" className="w-12 h-12 object-contain border rounded" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border rounded-lg p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border rounded-lg p-2 h-24"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.categoryId}
              onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value }))}
              className="w-full border rounded-lg p-2"
            >
              <option value="">Uncategorized</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
              <input
                type="number"
                value={form.basePrice}
                onChange={e => setForm(prev => ({ ...prev, basePrice: e.target.value }))}
                className="w-full border rounded-lg p-2"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
              <input
                value={form.priceRange}
                onChange={e => setForm(prev => ({ ...prev, priceRange: e.target.value }))}
                className="w-full border rounded-lg p-2"
                placeholder="$50-75"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
              <input
                type="number"
                value={form.duration}
                onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full border rounded-lg p-2"
                min="0"
                step="1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
            <button
              type="button"
              onClick={() => onSave(form)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bundle Form Modal
function BundleFormModal({ isOpen, onClose, onSave, bundle, allServices, detailerId, businessName }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (data: any) => void, 
  bundle: Bundle | null, 
  allServices: Service[],
  detailerId?: string,
  businessName?: string
}) {
  const [name, setName] = useState(bundle?.name || '');
  const [description, setDescription] = useState(bundle?.description || '');
  const [price, setPrice] = useState(bundle?.price || '');
  const [imageUrl, setImageUrl] = useState(bundle?.imageUrl || '');
  const [selectedServices, setSelectedServices] = useState<string[]>(bundle?.services.map(s => s.service.id) || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(bundle?.name || '');
    setDescription(bundle?.description || '');
    setPrice(bundle?.price || '');
    setImageUrl(bundle?.imageUrl || '');
    setSelectedServices(bundle?.services.map(s => s.service.id) || []);
  }, [bundle, isOpen]);

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
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 text-2xl text-gray-500 hover:text-gray-800 transition-colors">&times;</button>
        <h2 className="text-xl font-bold mb-6 text-gray-900">{bundle ? 'Edit Bundle' : 'Create New Bundle'}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bundle Image</label>
            <ImageUploader
              onUpload={handleImageUpload}
              businessName={businessName || 'bundle-image'}
              detailerId={detailerId}
              type="bundle"
              images={imageUrl ? [{ url: imageUrl, alt: name, type: 'bundle' }] : []}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bundle Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg p-2" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg p-2 h-24"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full border rounded-lg p-2" required min="0" step="0.01" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Included Services</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-4 border rounded-lg">
              {allServices.map(service => (
                <div key={service.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`service-${service.id}`}
                    checked={selectedServices.includes(service.id)}
                    onChange={() => handleServiceToggle(service.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={`service-${service.id}`} className="ml-3 text-sm text-gray-700">{service.name}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400" disabled={saving}>
              {saving ? 'Saving...' : 'Save Bundle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
