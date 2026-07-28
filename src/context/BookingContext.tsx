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
  { id: 'tech-1', name: 'Alex Vance', role: 'Senior ASE Master Tech', vanNumber: 'Mobile Unit #2 (Ford F-250 Rig)', phone: '(214) 620-3244', rating: 4.9 },
  { id: 'tech-2', name: 'Marcus Hill', role: 'Diagnostic & Brake Specialist', vanNumber: 'Mobile Unit #1 (Transit Rig)', phone: '(214) 620-3244', rating: 4.9 },
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'AP-8492',
    customerName: 'Mark Stevens',
    customerPhone: '(214) 555-8123',
    customerAddress: '1234 Canyon Falls Dr, Northlake, TX 76226',
    zipCode: '76226',
    vehicle: '2021 Ford F-150 (3.5L V6 EcoBoost Twin-Turbo)',
    vin: '1FTFW1E84MKD12345',
    services: ['Front Brake Pads & Rotor Replacement', 'Full Synthetic Oil Change & Filter'],
    totalEstimate: 335,
    locationType: 'mobile',
    status: 'EN_ROUTE',
    claimedBy: DEFAULT_TECHS[0],
    distanceMiles: 3.8,
    etaMinutes: 9,
    dateCreated: '2026-07-20 08:30 AM',
  },
  {
    id: 'AP-9104',
    customerName: 'Jessica Taylor',
    customerPhone: '(940) 555-4921',
    customerAddress: '500 Harvest Way, Justin, TX 76247',
    zipCode: '76247',
    vehicle: '2020 Chevy Tahoe (5.3L V8)',
    services: ['AGM/Heavy Duty Battery Swap', 'Full Computer Diagnostic & Coding'],
    totalEstimate: 280,
    locationType: 'mobile',
    status: 'UNASSIGNED',
    distanceMiles: 4.2,
    etaMinutes: 11,
    dateCreated: '2026-07-20 09:15 AM',
  },
  {
    id: 'AP-7732',
    customerName: 'David Rodriguez',
    customerPhone: '(817) 555-3092',
    customerAddress: '100 Country Club Rd, Argyle, TX 76227',
    zipCode: '76227',
    vehicle: '2022 RAM 2500 Cummins (6.7L Turbo Diesel)',
    services: ['Complete 4-Wheel Brake Overhaul'],
    totalEstimate: 525,
    locationType: 'mobile',
    status: 'ON_SITE',
    claimedBy: DEFAULT_TECHS[1],
    distanceMiles: 0,
    etaMinutes: 0,
    dateCreated: '2026-07-20 07:45 AM',
  },
];

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [activeTech, setActiveTech] = useState<TechProfile>(DEFAULT_TECHS[0]);

  const refreshBookings = useCallback(async () => {
    const remote = await fetchAllBookings();
    if (remote.length > 0) {
      setBookings(remote);
    }
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
