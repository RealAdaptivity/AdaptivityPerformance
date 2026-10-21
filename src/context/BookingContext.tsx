import React, { createContext, useContext, useState, useCallback } from 'react';
import type { VehicleClass } from '../services/vehicleLaborRate';
/**
 * `bookingsApi` is loaded on demand rather than imported. It pulls in the
 * Supabase client — 200 KB — and this provider wraps the whole site, so a
 * static import put the entire database layer on the critical path of every
 * marketing and landing page, none of which need it to render.
 */
const bookingsApi = () => import('../services/bookingsApi');

export type JobStatus = 'UNASSIGNED' | 'EN_ROUTE' | 'ON_SITE' | 'COMPLETED' | 'CANCELED';

export interface TechProfile {
  id: string;
  name: string;
  role: string;
  vanNumber: string;
  phone: string;
  /** From the tech's profile; null when none is on file (never made up). */
  rating: number | null;
}

export interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  zipCode: string;
  vehicle: string;
  /** Regular / European / Diesel, as picked when booking; null on older bookings. */
  vehicleClass?: VehicleClass | null;
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
  /** 'phone' when an admin booked it for a caller from the dispatch board. */
  bookingSource?: 'website' | 'phone';
  /** The admin who took a phone booking. */
  bookedByName?: string | null;
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
  getBookingById: (bookingId: string) => Booking | undefined;
  refreshBookings: () => Promise<void>;
}

const INITIAL_BOOKINGS: Booking[] = [];

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);

  const refreshBookings = useCallback(async () => {
    const { fetchAllBookings } = await bookingsApi();
    setBookings(await fetchAllBookings());
  }, []);

  /* Nothing loads on mount. This provider only wraps the public site, where a
     visitor can read no bookings: fetching them and holding a realtime channel
     open cost every page the Supabase client, a request and two websockets for
     an empty list. The tracker looks a booking up by its reference itself, and
     a new booking refreshes this list when it is made. */

  const getBookingById = (bookingId: string) => {
    return bookings.find(b => b.id.toUpperCase() === bookingId.toUpperCase());
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
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
