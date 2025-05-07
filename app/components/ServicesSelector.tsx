"use client";
import React, { useEffect, useState } from "react";

const CATEGORIES = ["Interior", "Exterior", "Additional"] as const;
type Category = typeof CATEGORIES[number];

interface Service {
  name: string;
  category: Category;
}

interface ServicesSelectorProps {
  value?: string[];
  onChange: (services: string[]) => void;
  error?: string;
}

export default function ServicesSelector({ value = [], onChange, error }: ServicesSelectorProps) {
  const [existing, setExisting] = useState<Service[]>([]);
  const [newService, setNewService] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("Interior");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/detailers/services")
      .then(res => res.json())
      .then(data => setExisting(data.services || []))
      .catch(() => setExisting([]))
      .finally(() => setLoading(false));
  }, []);

  // Group services by category
  const grouped: Record<Category, Service[]> = {
    Interior: [],
    Exterior: [],
    Additional: [],
  };
  existing.forEach(s => {
    if (grouped[s.category as Category]) {
      grouped[s.category as Category].push(s);
    }
  });

  const handleToggle = (serviceName: string) => {
    if (value.includes(serviceName)) {
      onChange(value.filter(s => s !== serviceName));
    } else {
      onChange([...value, serviceName]);
    }
  };

  const handleAdd = () => {
    const trimmed = newService.trim();
    if (trimmed && newCategory && !value.includes(trimmed)) {
      // Add to selected and to local list for immediate feedback
      onChange([...value, trimmed]);
      setExisting([...existing, { name: trimmed, category: newCategory }]);
      setNewService("");
      setNewCategory("Interior");
    }
  };

  console.log("ServicesSelector - value (checked):", value);
  console.log("ServicesSelector - existing (available):", existing);

  return (
    <div className="space-y-2">
      {CATEGORIES.map(cat => (
        <div key={cat} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: "bold", marginBottom: 4 }}>{cat}</div>
          {grouped[cat].length === 0 && <div style={{ color: "#888" }}>No services</div>}
          <div>
            {grouped[cat].map(service => (
              <div key={service.name} className="mb-1">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={value.includes(service.name)}
                    onChange={() => handleToggle(service.name)}
                    className="mr-2"
                  />
                  {service.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12 }}>
        <input
          type="text"
          value={newService}
          onChange={e => setNewService(e.target.value)}
          placeholder="Add new service"
          style={{ marginRight: 8 }}
        />
        <select
          value={newCategory}
          onChange={e => setNewCategory(e.target.value as Category)}
          style={{ marginRight: 8 }}
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newService.trim()}
          className="bg-green-700 text-white font-bold rounded-lg shadow px-4 py-2 text-sm transition-all duration-200 transform hover:bg-green-800 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-800 focus:ring-offset-2 disabled:bg-green-800 disabled:text-white"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {value.map(service => (
          <span key={service} className="badge badge-primary">{service}</span>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
} 