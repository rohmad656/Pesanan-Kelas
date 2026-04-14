import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface DataContextType {
  rooms: any[];
  bookings: any[];
  notifications: any[];
  loadingRooms: boolean;
  loadingBookings: boolean;
}

const DataContext = createContext<DataContextType>({
  rooms: [],
  bookings: [],
  notifications: [],
  loadingRooms: true,
  loadingBookings: true,
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (!profile) return;

    // Fetch Rooms
    const qRooms = query(collection(db, 'rooms'));
    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(roomsData);
      setLoadingRooms(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rooms');
      setLoadingRooms(false);
    });

    // Fetch Bookings
    let qBookings = query(collection(db, 'bookings'));
    if (profile.role !== 'admin') {
      qBookings = query(collection(db, 'bookings'), where('userId', '==', profile.uid));
    }
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      bookingsData.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setBookings(bookingsData);
      setLoadingBookings(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
      setLoadingBookings(false);
    });

    return () => {
      unsubRooms();
      unsubBookings();
    };
  }, [profile]);

  return (
    <DataContext.Provider value={{ rooms, bookings, notifications, loadingRooms, loadingBookings }}>
      {children}
    </DataContext.Provider>
  );
};
