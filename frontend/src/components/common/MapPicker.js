import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';

// fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }) => {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker 
      position={position} 
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          setPosition(e.target.getLatLng());
        },
      }}
    />
  );
};

// Component to handle map center updates
const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16);
    }
  }, [center, map]);
  return null;
};

const MapPicker = ({ defaultPos, onLocationSelect }) => {
  const [position, setPosition] = useState(defaultPos || { lat: 13.0827, lng: 80.2707 }); // Default to Chennai
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const syncLocation = async () => {
      if (!onLocationSelect) return;
      
      try {
        // Fetch full address details for the new coordinates
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&zoom=18`);
        const data = await res.json();
        const addr = data.address || {};
        
        const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
        const street = addr.road || addr.pedestrian || '';
        const area = addr.suburb || addr.neighbourhood || '';
        
        onLocationSelect({
          lat: position.lat,
          lng: position.lng,
          address: [street, area].filter(Boolean).join(', '),
          city: city.replace(' District', ''),
          state: addr.state || ''
        });
      } catch (err) {
        // Fallback to just coordinates if API fails
        onLocationSelect({ lat: position.lat, lng: position.lng });
      }
    };
    
    const timeoutId = setTimeout(syncLocation, 500);
    return () => clearTimeout(timeoutId);
  }, [position, onLocationSelect]);



  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    setSearching(true);
    toast.loading('Finding your location…', { id: 'mapLocate' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(latlng);
        setSearching(false);
        toast.success('Located! Drag the pin to adjust.', { id: 'mapLocate' });
      },
      (err) => {
        setSearching(false);
        const isHTTP = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
        if (isHTTP) {
          toast.error('GPS requires HTTPS. Please drag the 📌 pin on the map to set your location.', { duration: 5000, id: 'mapLocate' });
        } else if (err.code === 1) {
          toast.error('Location access denied. Please allow location in your browser settings.', { id: 'mapLocate' });
        } else {
          toast.error('Could not get location. Drag the 📌 pin to set it manually.', { id: 'mapLocate' });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };



  return (
    <div className="map-picker-container" style={{ position: 'relative', height: '100%', minHeight: '300px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
      
      <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png"
        />
        <ChangeView center={position} />
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>

      {/* Locate Me Button */}
      <button
        type="button"
        onClick={handleLocateMe}
        disabled={searching}
        style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 1000,
          background: 'white', border: '1px solid var(--gray-200)',
          borderRadius: '10px', padding: '8px 14px',
          fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
          boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '6px',
          color: searching ? 'var(--gray-400)' : 'var(--primary-700)'
        }}
        title="Use my current GPS location"
      >
        {searching ? '⏳ Finding…' : '📍 Use My Location'}
      </button>

      {/* Coordinates Badge */}
      <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(255,255,255,0.9)', padding: '5px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', zIndex: 1000, boxShadow: 'var(--shadow-sm)', color: 'var(--gray-500)', letterSpacing: '0.5px' }}>
        📌 {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
      </div>
    </div>
  );
};

export default MapPicker;
