import { LoadScriptProps } from '@react-google-maps/api';

export const GOOGLE_MAPS_CONFIG = {
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  libraries: ['places'] as ['places'],
  region: 'US',
  language: 'en',
  version: 'weekly'
} 