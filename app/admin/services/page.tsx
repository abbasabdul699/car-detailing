"use client";
import React, { useEffect, useState } from "react";
import IconUploader from '@/app/components/IconUploader';
import AdminNavbar from '@/app/components/AdminNavbar';

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
  icon: string; // S3 URL
  categoryId?: string;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '', categoryId: '' });
  const [error, setError] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Fetch services and categories
  const fetchServices = async () => {
    setLoading(true);
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/categories'),
      ]);
      const servicesData = await servicesRes.json();
      const categoriesData = await categoriesRes.json();
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err) {
      setServices([]);
      setCategories([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openAddModal = () => {
    setEditingService(null);
    setForm({ name: '', description: '', icon: '', categoryId: categories[0]?.id || '' });
    setShowModal(true);
    setError('');
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description,
      icon: service.icon,
      categoryId: service.categoryId || categories[0]?.id || '',
    });
    setShowModal(true);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await fetch(`/api/services/${id}`, { method: 'DELETE' });
      fetchServices();
    } catch (err) {
      alert('Failed to delete service');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingService) {
        // PATCH
        const res = await fetch(`/api/services/${editingService.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to update service');
          return;
        }
      } else {
        // POST
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to add service');
          return;
        }
      }
      setShowModal(false);
      fetchServices();
    } catch (err) {
      setError('Failed to save service');
    }
  };

  // Group services by categoryId
  const groupedServices = Array.isArray(categories)
    ? categories.reduce((acc, cat) => {
        acc[cat.id] = services.filter(s => s.categoryId === cat.id);
        return acc;
      }, {} as Record<string, Service[]>)
    : {};

  return (
    <>
      <AdminNavbar />
      <div className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-3xl font-bold mb-8">Manage Services</h1>
        <button
          className="mb-6 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
          onClick={openAddModal}
        >
          + Add Service
        </button>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-10">
            {categories.map(category => {
              const expanded = expandedCategories[category.id] ?? true;
              return (
                <div key={category.id}>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-2xl font-bold mb-4 text-gray-700 focus:outline-none hover:underline"
                    onClick={() => setExpandedCategories(prev => ({ ...prev, [category.id]: !expanded }))}
                    aria-expanded={expanded}
                  >
                    <span>{expanded ? '▼' : '►'}</span>
                    {category.icon && <img src={category.icon} alt="icon" className="w-6 h-6 mr-2 inline-block" />}
                    {category.name}
                  </button>
                  {expanded && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {groupedServices[category.id]?.map(service => (
                        <div key={service.id} className="bg-white p-6 rounded-xl shadow flex flex-col items-center text-center">
                          <img src={service.icon} alt={service.name} className="w-16 h-16 mb-2 object-contain" />
                          <h3 className="font-bold text-lg mb-1">{service.name}</h3>
                          <p className="text-gray-600 mb-2">{service.description}</p>
                          <div className="flex gap-2 mt-2">
                            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => openEditModal(service)}>Edit</button>
                            <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => handleDelete(service.id)}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Modal for Add/Edit */}
        {showModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <form className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md relative animate-fade-in" onSubmit={handleSubmit}>
              <h2 className="text-2xl font-extrabold mb-2 text-gray-900 text-center tracking-tight">{editingService ? 'Edit Service' : 'Add Service'}</h2>
              <div className="h-1 w-16 bg-green-500 rounded-full mx-auto mb-6" />
              <div className="space-y-5">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">Name</label>
                  <input
                    className="w-full rounded-lg px-4 py-2 border border-gray-300 bg-gray-50 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition placeholder-gray-400"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="e.g. Hand Wash & Dry"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">Description</label>
                  <textarea
                    className="w-full rounded-lg px-4 py-2 border border-gray-300 bg-gray-50 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition placeholder-gray-400"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    required
                    maxLength={120}
                    placeholder="Short, marketable description..."
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">Category</label>
                  <select
                    className="w-full rounded-lg px-4 py-2 border border-gray-300 bg-gray-50 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
                    value={form.categoryId}
                    onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">Icon (SVG)</label>
                  <IconUploader onUpload={url => setForm(f => ({ ...f, icon: url }))} />
                  {form.icon && (
                    <div className="mt-2 flex flex-col items-center">
                      <span className="text-xs text-gray-400 mb-1">Current Icon:</span>
                      <img src={form.icon} alt="Icon preview" className="w-12 h-12 object-contain border rounded" />
                    </div>
                  )}
                </div>
                {error && <div className="text-red-600 mb-2 text-center">{error}</div>}
                <div className="flex flex-col md:flex-row gap-3 mt-6">
                  <button type="button" className="w-full md:w-auto px-4 py-2 bg-gray-200 rounded-lg font-semibold hover:bg-gray-300 transition" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">{editingService ? 'Save' : 'Add'}</button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
} 