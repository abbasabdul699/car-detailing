'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as Select from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';

const VEHICLE_TYPES = [
  'Sedan',
  'SUV',
  'Truck',
  'Van',
  'Motorcycle',
];

export default function ModelYearStep({ params }: { params: { detailerId: string } }) {
  const { detailerId } = params;
  const searchParams = useSearchParams();
  const brand = searchParams.get('brand');
  const service = searchParams.get('service');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [years, setYears] = useState<string[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);

  const [selectedType, setSelectedType] = useState<string | null>(null);

  const router = useRouter();

  // Fetch models for the selected brand
  useEffect(() => {
    if (!brand) return;
    setLoadingModels(true);
    fetch(`/api/model?brand=${encodeURIComponent(brand)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && typeof data[0] === 'object' && data[0]?.name) {
          setModels(data.map((m: any) => m.name));
        } else if (Array.isArray(data)) {
          setModels(data);
        } else {
          setModels([]);
        }
      })
      .finally(() => setLoadingModels(false));
  }, [brand]);

  // Fetch years for the selected model
  useEffect(() => {
    if (!brand || !selectedModel) return;
    setLoadingYears(true);
    fetch(`/api/model?brand=${encodeURIComponent(brand)}`)
      .then(res => res.json())
      .then((models) => {
        const foundModel = Array.isArray(models)
          ? models.find((m: any) => m.name === selectedModel)
          : null;
        if (foundModel && Array.isArray(foundModel.years)) {
          setYears(foundModel.years.map((y: any) => y.toString()));
        } else {
          setYears([]);
        }
      })
      .finally(() => setLoadingYears(false));
  }, [brand, selectedModel]);

  const handleContinue = () => {
    if (selectedModel && selectedYear && selectedType) {
      router.push(
        `/book/${detailerId}/condition?brand=${encodeURIComponent(brand!)}&model=${encodeURIComponent(selectedModel)}&year=${encodeURIComponent(selectedYear)}&type=${encodeURIComponent(selectedType)}&service=${encodeURIComponent(service ?? '')}`
      );
    }
  };

  const handleBack = () => {
    router.push(`/book/${detailerId}/brand?service=${encodeURIComponent(service ?? '')}`);
  };

  if (!brand) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow p-12 w-full max-w-2xl md:max-w-3xl animate-fadein">
        <button onClick={handleBack} className="mb-4 text-gray-500 hover:text-black">&larr; Back</button>
        <h1 className="text-2xl font-bold mb-6">Book a Service</h1>
        <h2 className="text-lg font-semibold mb-4">What is your car model?</h2>
        <div className="mb-6">
          <Select.Root value={selectedModel || ''} onValueChange={value => { setSelectedModel(value); setSelectedYear(null); }}>
            <Select.Trigger
              className="w-full flex items-center justify-between border rounded-xl px-4 py-3 bg-white shadow focus:outline-none focus:ring-2 focus:ring-black text-lg font-semibold text-gray-700"
              aria-label="Car model"
            >
              <Select.Value placeholder={loadingModels ? 'Loading...' : 'Select car model'} />
              <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="rounded-2xl shadow-lg bg-white border mt-2 overflow-hidden">
                <Select.Viewport className="py-2">
                  {models.map(model => (
                    <Select.Item
                      key={model}
                      value={model}
                      className="flex items-center px-6 py-3 cursor-pointer text-lg text-gray-800 hover:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:font-bold data-[state=checked]:text-black outline-none"
                    >
                      <Select.ItemText>{model}</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <CheckIcon className="h-5 w-5 text-black" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <h2 className="text-lg font-semibold mb-4">What is your car year?</h2>
        <div className="mb-6">
          <Select.Root value={selectedYear || ''} onValueChange={setSelectedYear} disabled={loadingYears || years.length === 0}>
            <Select.Trigger
              className="w-full flex items-center justify-between border rounded-xl px-4 py-3 bg-white shadow focus:outline-none focus:ring-2 focus:ring-black text-lg font-semibold text-gray-700"
              aria-label="Car year"
            >
              <Select.Value placeholder={loadingYears ? 'Loading...' : 'Select car year'} />
              <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="rounded-2xl shadow-lg bg-white border mt-2 overflow-hidden">
                <Select.Viewport className="py-2">
                  {years.map(year => (
                    <Select.Item
                      key={year}
                      value={year}
                      className="flex items-center px-6 py-3 cursor-pointer text-lg text-gray-800 hover:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:font-bold data-[state=checked]:text-black outline-none"
                    >
                      <Select.ItemText>{year}</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <CheckIcon className="h-5 w-5 text-black" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <h2 className="text-lg font-semibold mb-4">What type of vehicle is it?</h2>
        <div className="mb-6">
          <Select.Root value={selectedType || ''} onValueChange={setSelectedType}>
            <Select.Trigger
              className="w-full flex items-center justify-between border rounded-xl px-4 py-3 bg-white shadow focus:outline-none focus:ring-2 focus:ring-black text-lg font-semibold text-gray-700"
              aria-label="Vehicle type"
            >
              <Select.Value placeholder="Select vehicle type" />
              <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="rounded-2xl shadow-lg bg-white border mt-2 overflow-hidden">
                <Select.Viewport className="py-2">
                  {VEHICLE_TYPES.map(type => (
                    <Select.Item
                      key={type}
                      value={type}
                      className="flex items-center px-6 py-3 cursor-pointer text-lg text-gray-800 hover:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:font-bold data-[state=checked]:text-black outline-none"
                    >
                      <Select.ItemText>{type}</Select.ItemText>
                      <Select.ItemIndicator className="ml-auto">
                        <CheckIcon className="h-5 w-5 text-black" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <button
          className="w-full py-3 rounded-full bg-black text-white font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition"
          disabled={!selectedModel || !selectedYear || !selectedType}
          onClick={handleContinue}
        >
          Continue
        </button>
      </div>
      <style jsx global>{`
        .animate-fadein {
          animation: fadein 0.5s;
        }
        @keyframes fadein {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
