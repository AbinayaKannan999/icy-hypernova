import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const useLiveLocation = (deliveryId = null) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const { emit } = useSocket();
  const { user } = useAuth();

  const updateLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const success = (position) => {
      const { latitude, longitude } = position.coords;
      const newPos = { lat: latitude, lng: longitude };
      setLocation(newPos);
      
      // If user is volunteer and on a delivery, emit to socket
      if (user?.role === 'volunteer' && deliveryId) {
        emit('location_update', {
          delivery_id: deliveryId,
          latitude,
          longitude
        });
      }
    };

    const handleError = (err) => {
      console.warn('Geolocation error:', err.message);
      setError(err.message);
    };

    const watchId = navigator.geolocation.watchPosition(success, handleError, options);
    return watchId;
  }, [user, deliveryId, emit]);

  useEffect(() => {
    let watchId;
    if (user?.role === 'volunteer' && deliveryId) {
      watchId = updateLocation();
    }
    
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user, deliveryId, updateLocation]);

  return { location, error };
};
