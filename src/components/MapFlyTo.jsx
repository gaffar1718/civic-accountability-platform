// =============================================================================
// src/components/MapFlyTo.jsx
// Helper component that lives inside <MapContainer> and uses the useMap hook
// to fly the map to a target coordinate when the `coords` prop changes.
// =============================================================================

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * @param {Object} props
 * @param {[number, number]} props.coords - [lat, lng] to fly to
 * @param {number} [props.zoom=12] - zoom level after fly
 */
export default function MapFlyTo({ coords, zoom = 12 }) {
  const map = useMap();

  useEffect(() => {
    if (!coords || coords.length !== 2) return;
    const [lat, lng] = coords;
    if (isNaN(lat) || isNaN(lng)) return;

    map.flyTo([lat, lng], zoom, {
      animate: true,
      duration: 1.6,  // seconds
      easeLinearity: 0.35,
    });
  }, [coords, zoom, map]);

  return null; // render-less component
}
