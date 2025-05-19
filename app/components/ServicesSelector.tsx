"use client";
import React, { useEffect, useState } from "react";

const CATEGORIES = ["Bundle", "Exterior", "Interior", "Additional"] as const;
type Category = typeof CATEGORIES[number];

interface Service {
  name: string;
  category?: { name: string } | string;
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
    Bundle: [],
    Interior: [],
    Exterior: [],
    Additional: [],
  };
  existing.forEach(s => {
    const cat = typeof s.category === 'string' ? s.category : s.category?.name;
    if (grouped[cat as Category]) {
      grouped[cat as Category].push(s);
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
      <div className="flex flex-wrap gap-2 mt-2">
        {value.map(service => (
          <span key={service} className="badge badge-primary">{service}</span>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
} 