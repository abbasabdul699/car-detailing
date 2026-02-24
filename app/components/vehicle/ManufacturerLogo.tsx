'use client';

import React, { useMemo, useState } from 'react';
import { DEFAULT_VEHICLE_CATALOG, getManufacturerByName, getManufacturerLogo } from '@/lib/vehicleCatalog';

interface ManufacturerLogoProps {
  manufacturerName?: string | null;
  className?: string;
  alt?: string;
}

const SIMPLE_ICON_OVERRIDES: Record<string, string[]> = {
  Dodge: ['dodge'],
  Buick: ['buick'],
  Genesis: ['genesis'],
  GMC: ['gmc'],
  Jaguar: ['jaguar'],
  Lexus: ['lexus'],
  Lincoln: ['lincoln'],
  Rivian: ['rivian'],
  'Mercedes-Benz': ['mercedesbenz', 'mercedes'],
  'Land Rover': ['landrover'],
  'Alfa Romeo': ['alfaromeo'],
  'Aston Martin': ['astonmartin'],
};

const CLEARBIT_DOMAIN_OVERRIDES: Record<string, string> = {
  Dodge: 'dodge.com',
  Buick: 'buick.com',
  Genesis: 'genesis.com',
  GMC: 'gmc.com',
  Jaguar: 'jaguar.com',
  'Land Rover': 'landrover.com',
  Lexus: 'lexus.com',
  Lincoln: 'lincoln.com',
  Rivian: 'rivian.com',
};

const LOCAL_BADGE_OVERRIDES: Record<string, { label: string; bg: string; fg: string }> = {
  Dodge: { label: 'D', bg: '#D71920', fg: '#FFFFFF' },
  Buick: { label: 'B', bg: '#1E3A8A', fg: '#FFFFFF' },
  Genesis: { label: 'G', bg: '#111827', fg: '#FFFFFF' },
  GMC: { label: 'GMC', bg: '#991B1B', fg: '#FFFFFF' },
  Jaguar: { label: 'J', bg: '#111827', fg: '#FFFFFF' },
  'Land Rover': { label: 'LR', bg: '#0D7A4E', fg: '#FFFFFF' },
  Lexus: { label: 'L', bg: '#4B5563', fg: '#FFFFFF' },
  Lincoln: { label: 'L', bg: '#111827', fg: '#FFFFFF' },
  Rivian: { label: 'R', bg: '#B45309', fg: '#FFFFFF' },
};

function buildLogoCandidates(manufacturerName?: string | null): string[] {
  if (!manufacturerName) return [];
  const manufacturer = getManufacturerByName(manufacturerName, DEFAULT_VEHICLE_CATALOG);
  const base = getManufacturerLogo(manufacturerName, DEFAULT_VEHICLE_CATALOG);
  const slug = manufacturer?.slug || manufacturerName.toLowerCase().replace(/[^a-z0-9]+/g, '');

  const candidates = new Set<string>([
    base,
    `https://cdn.simpleicons.org/${slug}`,
    `https://cdn.simpleicons.org/${slug.replace(/-/g, '')}`,
  ]);

  for (const override of SIMPLE_ICON_OVERRIDES[manufacturerName] || []) {
    candidates.add(`https://cdn.simpleicons.org/${override}`);
  }

  const clearbitDomain = CLEARBIT_DOMAIN_OVERRIDES[manufacturerName];
  if (clearbitDomain) {
    candidates.add(`https://logo.clearbit.com/${clearbitDomain}`);
  }

  return Array.from(candidates).filter(Boolean);
}

function getInitials(name?: string | null): string {
  if (!name) return 'C';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'C';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function LocalLogoBadge({ manufacturerName, className }: { manufacturerName?: string | null; className: string }) {
  const config = manufacturerName ? LOCAL_BADGE_OVERRIDES[manufacturerName] : undefined;
  const label = config?.label || getInitials(manufacturerName);
  const bg = config?.bg || '#F3F4F6';
  const fg = config?.fg || '#6b6a5e';
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="6" fill={bg} stroke="#E5E7EB" strokeWidth="1" />
      <text
        x="16"
        y={label.length > 2 ? '18.5' : '20'}
        textAnchor="middle"
        fontSize={label.length > 2 ? '9' : '12'}
        fontWeight="700"
        fill={fg}
        fontFamily="Arial, sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}

export default function ManufacturerLogo({ manufacturerName, className = 'h-4 w-4', alt }: ManufacturerLogoProps) {
  const candidates = useMemo(() => buildLogoCandidates(manufacturerName), [manufacturerName]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  const currentSrc = candidates[candidateIndex];
  if (!currentSrc) {
    return <LocalLogoBadge manufacturerName={manufacturerName} className={className} />;
  }

  return (
    <img
      src={currentSrc}
      alt={alt || manufacturerName || 'Vehicle'}
      className={`${className} object-contain`}
      onError={() => {
        setCandidateIndex((prev) => prev + 1);
      }}
    />
  );
}

