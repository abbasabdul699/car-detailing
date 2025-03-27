import { LoadScriptProps } from '@react-google-maps/api';

export const GOOGLE_MAPS_CONFIG: LoadScriptProps = {
  id: 'google-map-script',
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  libraries: ['places', 'maps'],
  language: 'en',
  region: 'US',
}; 