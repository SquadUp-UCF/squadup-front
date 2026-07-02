import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const userLocationIcon = L.divIcon({
  className: "",
  html: '<div class="pulsing-dot" style="--dot-color: #1ca10d; --dot-shadow: rgba(28,161,13,0.6); --dot-shadow-end: rgba(28,161,13,0); --dot-spread: 30px;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const API = import.meta.env.VITE_API_URL;
const defaultPosition = [51.505, -0.09];

const RANGE_OPTIONS = [
  { label: "1 mi", value: 1 },
  { label: "3 mi", value: 3 },
  { label: "5 mi", value: 5 },
  { label: "10 mi", value: 10 },
];

// Roughly converts a mile radius into a lat/lng bounding box around a center point
function getBoundsForRadius(center, radiusMiles) {
  const [lat, lng] = center;
  const milesPerDegreeLat = 69;
  const milesPerDegreeLng = 69 * Math.cos((lat * Math.PI) / 180);
  const latDelta = radiusMiles / milesPerDegreeLat;
  const lngDelta = radiusMiles / milesPerDegreeLng;
  return [
    [lat - latDelta, lng - lngDelta],
    [lat + latDelta, lng + lngDelta],
  ];
}

function MapRefSetter({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

export default function MapComponent() {
  const [locations, setLocations] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(5);
  const mapRef = useRef(null);
  const hasCenteredOnUser = useRef(false);

  useEffect(() => {
    fetch(`${API}/api/locations`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error loading locations:', err));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => setLocationError(err.message)
    );
  }, []);

  // Once we have both the map instance AND the user's position, snap to it (one time)
  useEffect(() => {
    if (userPosition && mapRef.current && !hasCenteredOnUser.current) {
      mapRef.current.setView(userPosition, 13);
      hasCenteredOnUser.current = true;
    }
  }, [userPosition]);

  // Keep the map's bounds locked to the chosen radius around the user
  useEffect(() => {
    const center = userPosition || defaultPosition;
    if (mapRef.current) {
      const bounds = getBoundsForRadius(center, radiusMiles);
      mapRef.current.setMaxBounds(bounds);
    }
  }, [userPosition, radiusMiles]);

  function handleRecenter() {
    if (mapRef.current && userPosition) {
      mapRef.current.setView(userPosition, 13);
    }
  }

  return (
    <div style={{ height: '500px', width: '100%', position: 'relative' }}>
      {locationError && <p style={{ color: 'red' }}>{locationError}</p>}

      <MapContainer
        center={defaultPosition}
        zoom={13}
        minZoom={11}
        scrollWheelZoom={true}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRefSetter mapRef={mapRef} />

        {userPosition && (
          <Marker position={userPosition} icon={userLocationIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {locations.map((loc) => (
          <Marker key={loc.id} position={[loc.lat, loc.lng]}>
            <Popup>
              <strong>{loc.name}</strong> <br /> {loc.description}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Overlay controls, sitting on top of the map */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          display: 'flex',
          gap: 8,
        }}
      >

        <button
          onClick={handleRecenter}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid black',
            background: 'rgba(255, 255, 255, 0.6)',
            color: 'black',
            cursor: 'pointer',
          }}
        >
          Recenter
        </button>
      </div>
    </div>
  );
}