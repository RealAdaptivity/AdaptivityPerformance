import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  createBooking,
  fetchAllBookings,
  subscribeAllBookings,
  updateBookingStatusRemote,
} from '../services/bookingsApi';

export type JobStatus = 'UNASSIGNED' | 'EN_ROUTE' | 'ON_SITE' | 'COMPLETED' | 'CANCELED';

export interface TechProfile {
  id: string;
  name: string;
  role: string;
  vanNumber: string;
  phone: string;
  rating: number;
  stripeAccountId?: string | null;
}

export interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  zipCode: string;
  vehicle: string;
  vin?: string;
  services: string[];
  totalEstimate: number;
  locationType: 'mobile' | 'shop';
  status: JobStatus;
  claimedBy?: TechProfile;
  distanceMiles: number;
  etaMinutes: number;
  dateCreated: string;
  /** ISO created_at for SLA timers. */
  createdAtIso?: string;
  preferredMechanicId?: string | null;
  holdExpiresAt?: string | null;
  /** Supabase row UUID (for authenticated updates). */
  supabaseId?: string;
  paymentIntentId?: string | null;
  paymentStatus?: string;
  holdAmountCents?: number | null;
  capturedAmountCents?: number | null;
  dispatchLat?: number | null;
  dispatchLng?: number | null;
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
  customerNotes?: string | null;
}

interface BookingContextType {
  bookings: Booking[];
  activeTech: TechProfile;
  setActiveTech: (tech: TechProfile) => void;
  addBooking: (booking: Omit<Booking, 'id' | 'status' | 'dateCreated'>) => string;
  claimBooking: (bookingId: string) => void;
  updateBookingStatus: (bookingId: string, status: JobStatus, distanceMiles?: number, etaMinutes?: number) => void;
  getBookingById: (bookingId: string) => Booking | undefined;
  refreshBookings: () => Promise<void>;
}

const DEFAULT_TECHS: TechProfile[] = [
  { id: 'tech-1', name: 'Adaptivity Technician', role: 'Senior ASE Master Tech', vanNumber: 'Mobile Unit #2 (Ford F-250 Rig)', phone: '(940) 304-0620', rating: 4.9 },
  { id: 'tech-2', name: 'Adaptivity Technician', role: 'Diagnostic & Brake Specialist', vanNumber: 'Mobile Unit #1 (Transit Rig)', phone: '(940) 304-0620', rating: 4.9 },
];

const INITIAL_BOOKINGS: Booking[] = [];

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [activeTech, setActiveTech] = useState<TechProfile>(DEFAULT_TECHS[0]);

  const refreshBookings = useCallback(async () => {
    const remote = await fetchAllBookings();
    setBookings(remote);
  }, []);

  useEffect(() => {
    refreshBookings();
    const channel = subscribeAllBookings(() => {
      refreshBookings();
    });
    return () => {
      channel.unsubscribe();
    };
  }, [refreshBookings]);

  const addBooking = (bookingData: Omit<Booking, 'id' | 'status' | 'dateCreated'>): string => {
    const fallbackId = 'AP-' + Math.floor(1000 + Math.random() * 9000);
    const newBooking: Booking = {
      ...bookingData,
      id: fallbackId,
      status: 'UNASSIGNED',
      dateCreated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    setBookings(prev => [newBooking, ...prev]);

    void (async () => {
      const created = await createBooking(bookingData);
      if (created) {
        setBookings(prev => [
          created,
          ...prev.filter(b => b.id !== fallbackId && b.id !== created.id),
        ]);
      }
    })();

    return fallbackId;
  };

  const claimBooking = (bookingId: string) => {
    setBookings(prev =>
      prev.map(b =>
        b.id === bookingId
          ? { ...b, status: 'EN_ROUTE', claimedBy: activeTech, distanceMiles: b.distanceMiles || 5.0, etaMinutes: 12 }
          : b
      )
    );
    void updateBookingStatusRemote(bookingId, 'EN_ROUTE', {
      distanceMiles: 5,
      etaMinutes: 12,
      mechanicId: activeTech.id.startsWith('tech-') ? null : activeTech.id,
    });
  };

  const updateBookingStatus = (bookingId: string, status: JobStatus, distanceMiles?: number, etaMinutes?: number) => {
    setBookings(prev =>
      prev.map(b => {
        if (b.id === bookingId) {
          return {
            ...b,
            status,
            distanceMiles: distanceMiles !== undefined ? distanceMiles : b.distanceMiles,
            etaMinutes: etaMinutes !== undefined ? etaMinutes : b.etaMinutes,
          };
        }
        return b;
      })
    );
    void updateBookingStatusRemote(bookingId, status, { distanceMiles, etaMinutes });
  };

  const getBookingById = (bookingId: string) => {
    return bookings.find(b => b.id.toUpperCase() === bookingId.toUpperCase());
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        activeTech,
        setActiveTech,
        addBooking,
        claimBooking,
        updateBookingStatus,
        getBookingById,
        refreshBookings,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBookingContext = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBookingContext must be used within a BookingProvider');
  }
  return context;
};
