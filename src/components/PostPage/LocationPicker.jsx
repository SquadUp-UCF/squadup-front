/**
 * A small interactive map used inside the "Post a game" modal to pick where a
 * game is happening. Games can only be hosted within
 * `MAX_GAME_CREATION_RADIUS_MILES` of UCF, so the map always opens centered
 * on campus (never the host's own location) and is bounded so it can't be
 * panned outside that radius. Click the map (or drag the pin) to place the
 * exact spot. The chosen point is reported back as [lat, lng].
 */
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import "./LocationPicker.css";
import L from 'leaflet';
import { UCF_CENTER, MAX_GAME_CREATION_RADIUS_MILES, getBoundsForRadius } from '../../utils/games';

const CREATE_BOUNDS = getBoundsForRadius(UCF_CENTER, MAX_GAME_CREATION_RADIUS_MILES);

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

export default function LocationPicker({ userPosition, value, onPick }) {
  const center = value || UCF_CENTER;

  return (
    <div className="lp-container">
      <div className="lp-map-frame">
        <MapContainer
          center={center}
          zoom={15}
          scrollWheelZoom={true}
          maxBounds={CREATE_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={12}
          maxZoom={20}
          className="lp-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={20}
          />

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
    </div>
  );
}
