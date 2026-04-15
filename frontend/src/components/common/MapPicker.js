import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Loader2 } from 'lucide-react';
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
      toast.error('Geolocation not supported');
      return;
    }
    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(latlng);
        setSearching(false);
        toast.success('Located! Map centered on your position.');
      },
      () => {
        setSearching(false);
        toast.error('Could not get your location. Please check browser permissions.');
      }
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

      <div style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
         <button 
           type="button"
           className="btn btn-secondary" 
           style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
           onClick={handleLocateMe}
           title="Find my location"
         >
           {searching ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
         </button>
      </div>

      <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', zIndex: 1000, boxShadow: 'var(--shadow-sm)', color: 'var(--gray-600)' }}>
        <MapPin size={12} style={{ marginRight: '4px', display: 'inline' }} />
        {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
      </div>
    </div>
  );
};

export default MapPicker;
