import React from 'react';
import { Hero } from '../components/Hero';
import {
  CoverageSection,
  FinalCta,
  HowItWorks,
  MoreLinks,
  PriceBand,
  ServicesGrid,
  TrustBand,
} from '../components/HomeSections';
import type { BookingPrefill } from '../site/homeContent';

type Props = {
  /** Opens the booking form holding whatever the page already collected. The
   *  source is for analytics; the prefill never is. */
  onBook: (prefill: BookingPrefill, source: string) => void;
};

/**
 * The homepage has one job: get a driver within the radius from "something is
 * wrong with my vehicle" to a booked visit. Everything on it either answers a
 * question they have on the way there — what does it cost, do you fix this, do
 * you come to me, what if it goes wrong — or is the booking itself.
 *
 * What used to be here and is not (financing, fleet and HOA, the comparison
 * table, the partner and recruitment sections) still lives on its own page; the
 * footer and the "Also from Adaptivity" row link to them.
 */
export const HomePage: React.FC<Props> = ({ onBook }) => (
  <>
    <Hero onBook={onBook} />
    <PriceBand />
    <ServicesGrid onBook={onBook} />
    <HowItWorks />
    <CoverageSection />
    <TrustBand />
    <MoreLinks />
    <FinalCta onBook={onBook} />
  </>
);
