/**
 * A small interactive map used inside the "Post a game" modal to pick where a
 * game is happening. It opens centered on the user's current position so they
 * can look around nearby, then click the map (or drag the pin) to place the
 * exact spot. The chosen point is reported back as [lat, lng].
 */
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const DEFAULT_CENTER = [28.6024, -81.2001]; // UCF

// Emoji pin whose tip sits at the marker's coordinate (bottom-center anchor).
const pinIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:30px; line-height:1;">📍</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// Pulsing dot marking where the user actually is, for orientation.
const youAreHereIcon = L.divIcon({
  className: '',
  html: '<div class="pulsing-dot" style="--dot-color: #1ca10d; --dot-shadow: rgba(28,161,13,0.6); --dot-shadow-end: rgba(28,161,13,0); --dot-spread: 20px;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Turns clicks anywhere on the map into a new pin location.
function ClickToPlace({ onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// Recenters the map on the user's position once it becomes available (one time),
// and exposes a manual recenter via a ref the parent button can call.
function Centerer({ userPosition, controlRef }) {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (userPosition && !hasCentered.current) {
      map.setView(userPosition, 15);
      hasCentered.current = true;
    }
  }, [userPosition, map]);

  useEffect(() => {
    controlRef.current = () => {
      if (userPosition) map.setView(userPosition, 15);
    };
  }, [userPosition, map, controlRef]);

  return null;
}

export default function LocationPicker({ userPosition, value, onPick }) {
  const recenterRef = useRef(null);
  const center = value || userPosition || DEFAULT_CENTER;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ height: 220, width: '100%', borderRadius: 12, overflow: 'hidden' }}>
        <MapContainer
          center={center}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Centerer userPosition={userPosition} controlRef={recenterRef} />
          <ClickToPlace onPick={onPick} />

          {userPosition && <Marker position={userPosition} icon={youAreHereIcon} />}

          {value && (
            <Marker
              position={value}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend(e) {
                  const { lat, lng } = e.target.getLatLng();
                  onPick([lat, lng]);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {userPosition && (
        <button
          type="button"
          onClick={() => recenterRef.current && recenterRef.current()}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1000,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #D6E4D6',
            background: 'rgba(255,255,255,0.9)',
            fontSize: 12,
            fontWeight: 600,
            color: '#1F6B3E',
            cursor: 'pointer',
          }}
        >
          My location
        </button>
      )}
    </div>
  );
}
