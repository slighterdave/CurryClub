import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface RestaurantLocation {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  review_count: number;
}

// Church St, Banwell BS29 6EA
const MAP_CENTER: [number, number] = [51.329, -2.903];
const MAP_ZOOM = 13;

export function Maps() {
  const [locations, setLocations] = useState<RestaurantLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/restaurants/locations')
      .then((r) => r.json())
      .then((data) => setLocations(data.locations || []))
      .catch(() => setError('Failed to load map data. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Map</h2>
        <p className="text-gray-600">
          {locations.length === 0
            ? 'No restaurants with addresses yet. Add addresses in the admin panel.'
            : `${locations.length} restaurant${locations.length !== 1 ? 's' : ''} on the map`}
        </p>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: '480px' }}>
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map((loc) => (
            <CircleMarker
              key={loc.id}
              center={[loc.latitude, loc.longitude]}
              radius={10}
              pathOptions={{ color: '#ea580c', fillColor: '#f97316', fillOpacity: 0.9, weight: 2 }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold text-gray-800">{loc.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{loc.address}</p>
                  <p className="text-orange-600 text-xs mt-1">
                    {loc.review_count} review{loc.review_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
