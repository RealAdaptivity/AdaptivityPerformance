import { useEffect, useState, lazy, Suspense } from 'react';
import { BookingProvider, useBookingContext, type Booking } from './context/BookingContext';
import { Navbar } from './components/Navbar';
import { StickyMobileActionBar } from './components/StickyMobileActionBar';
import { Footer } from './components/Footer';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { isNativeShell } from './site/nativeShell';
import { useAdminConsoleRoute } from './admin/adminRoute';
import { usePortalRoute } from './portal/portalRoute';

// Admin & Portal are only reached on their own routes — code-split so marketing
// visitors never download them.
const AdminApp = lazy(() => import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })));
const PortalApp = lazy(() => import('./portal/PortalApp').then((m) => ({ default: m.PortalApp })));

// Modals and the chat widget are code-split: none of them is needed to paint a
// landing page, and together they pulled Stripe and the whole booking flow into
// the first request. Each mounts only while open, so the chunk is fetched on the
// click that needs it — with the booking chunk warmed on idle so the primary CTA
// still opens instantly.
const RepairTrackerDemo = lazy(() => import('./components/RepairTrackerDemo').then((m) => ({ default: m.RepairTrackerDemo })));
const BookingModal = lazy(() => import('./components/BookingModal').then((m) => ({ default: m.BookingModal })));
const CustomerGarageModal = lazy(() => import('./components/CustomerGarageModal').then((m) => ({ default: m.CustomerGarageModal })));
const InspectionReportModal = lazy(() => import('./components/InspectionReportModal').then((m) => ({ default: m.InspectionReportModal })));
const TechRecruitmentModal = lazy(() => import('./components/TechRecruitmentModal').then((m) => ({ default: m.TechRecruitmentModal })));
const PartnerApplyModal = lazy(() => import('./components/PartnerApplyModal').then((m) => ({ default: m.PartnerApplyModal })));
const MembershipModal = lazy(() => import('./components/MembershipModal').then((m) => ({ default: m.MembershipModal })));
const PaymentCheckoutModal = lazy(() => import('./components/PaymentCheckoutModal').then((m) => ({ default: m.PaymentCheckoutModal })));
const WarrantyModal = lazy(() => import('./components/WarrantyModal').then((m) => ({ default: m.WarrantyModal })));
const ReferralModal = lazy(() => import('./components/ReferralModal').then((m) => ({ default: m.ReferralModal })));
const AIMechanicChatbot = lazy(() => import('./components/AIMechanicChatbot').then((m) => ({ default: m.AIMechanicChatbot })));
const MarketingPage = lazy(() => import('./pages/MarketingPages').then((m) => ({ default: m.MarketingPage })));
const ReferralLandingPage = lazy(() => import('./pages/ReferralLandingPage').then((m) => ({ default: m.ReferralLandingPage })));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then((m) => ({ default: m.BlogPostPage })));
const PayLinkPage = lazy(() => import('./pages/PayLinkPage').then((m) => ({ default: m.PayLinkPage })));
import { SERVICE_CATALOG } from './services/serviceCatalog';
import { HomePage } from './pages/HomePage';
import { navigateSite, useSitePage, useSitePathname } from './site/siteRoute';
import {
  applyDocumentSeo,
  cityFromPath,
  citySeo,
  SITE_FAQS,
  setRobots,
  PAGE_SEO,
} from './site/seo';
import { CityLandingPage } from './pages/CityLandingPage';
import { blogSlugFromPath, payReferenceFromPath, referralCodeFromPath } from './site/routePaths';
import { serviceCityFromPath, serviceCityFaqs, serviceCityMeta } from './site/localSeo';
import { applyJsonLd, cityJsonLd, serviceCityJsonLd } from './site/structuredData';
import { ServiceCityPage } from './pages/ServiceCityPage';
import { AdLandingPage } from './pages/AdLandingPage';
import { adLandingFromPath, adLandingMeta } from './site/adLandings';
import { CONVERSION_EVENTS, trackEvent } from './site/analytics';

function MainAppContent() {
  const { refreshBookings } = useBookingContext();
  const page = useSitePage();
  const pathname = useSitePathname();
  const cityLanding = cityFromPath(pathname);
  const serviceCity = serviceCityFromPath(pathname);
  const adLanding = adLandingFromPath(pathname);
  const blogSlug = blogSlugFromPath(pathname);
  const referralCode = referralCodeFromPath(pathname);

  useEffect(() => {
    if (page === 'adLanding' && adLanding) {
      applyDocumentSeo(adLandingMeta(adLanding));
      setRobots('noindex,nofollow');
      applyJsonLd([]);
      return;
    }
    setRobots('index,follow');
    if (page === 'city' && cityLanding) {
      applyDocumentSeo(citySeo(cityLanding));
      applyJsonLd(cityJsonLd(cityLanding, SITE_FAQS.slice(0, 6)));
      return;
    }
    if (page === 'serviceCity' && serviceCity) {
      const { service, city } = serviceCity;
      applyDocumentSeo(serviceCityMeta(service, city));
      applyJsonLd(serviceCityJsonLd(service, city, serviceCityFaqs(service, city)));
      return;
    }
    applyJsonLd([]);
    if (page === 'blogPost') {
      // BlogPostPage applies post-specific SEO once loaded
      applyDocumentSeo(PAGE_SEO.blogPost);
      return;
    }
    if (page === 'referral') {
      return;
    }
    applyDocumentSeo(PAGE_SEO[page as keyof typeof PAGE_SEO] || PAGE_SEO.home);
  }, [page, cityLanding, serviceCity, adLanding]);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(false);
  const [isPartnerApplyOpen, setIsPartnerApplyOpen] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [isWarrantyOpen, setIsWarrantyOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [selectedMembershipPlan, setSelectedMembershipPlan] = useState<'basic' | 'vip' | 'fleet'>('vip');
  const [activeServiceMode, setActiveServiceMode] = useState<'mobile' | 'shop'>('mobile');
  const [estimateDataForBooking, setEstimateDataForBooking] = useState<any>(null);

  // Legacy #hash links on `/` → real pages
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const atHome = path === '/' || path === '' || path === base;
    if (!atHome) return;
    const map: Record<string, Parameters<typeof navigateSite>[0]> = {
      about: 'about',
      future: 'about',
      services: 'services',
      contact: 'contact',
      estimator: 'services',
      membership: 'membership',
      diagnostics: 'diagnostics',
      partners: 'partners',
      area: 'coverage',
      performance: 'performance',
      join: 'join',
      careers: 'careers',
      'want-to-teach': 'wantToTeach',
      teach: 'wantToTeach',
      learn: 'learn',
      train: 'learn',
      training: 'learn',
      faq: 'faq',
    };
    const target = map[hash];
    if (target) navigateSite(target, { replace: true, hash: hash === 'future' ? 'future' : undefined });
  }, []);

  // Scroll to in-page hash after route change (e.g. /about#future)
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [page]);

  /**
   * Hold the chat widget back until the page is idle, and warm the booking chunk
   * at the same time so the primary CTA never waits on a network round trip.
   */
  const [deferredWidgetsReady, setDeferredWidgetsReady] = useState(false);
  useEffect(() => {
    const onIdle = () => {
      void import('./components/BookingModal');
      setDeferredWidgetsReady(true);
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(onIdle, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(onIdle, 1200);
    return () => window.clearTimeout(id);
  }, []);

  const openBooking = (opts?: {
    referralCode?: string;
    source?: string;
    /** Extra attribution (city, service, landing, utm_*) forwarded to analytics. */
    [key: string]: string | undefined;
  }) => {
    const { referralCode, source, ...attribution } = opts ?? {};
    trackEvent(CONVERSION_EVENTS.bookingOpened, {
      source: source ?? 'site',
      page,
      ...(pathname !== '/' ? { path: pathname } : {}),
      ...(referralCode ? { referred: true } : {}),
      ...(attribution as Record<string, string>),
    });
    setEstimateDataForBooking({
      locationType: 'mobile',
      ...(referralCode ? { referralCode } : {}),
    });
    setIsBookingOpen(true);
  };

  const handleOpenBookingWithEstimate = (estimateDetails: any) => {
    setEstimateDataForBooking(estimateDetails);
    setIsBookingOpen(true);
  };

  const handleSelectRecommendedService = (serviceName: string) => {
    setEstimateDataForBooking({
      services: [serviceName],
      locationType: 'mobile',
    });
    setIsBookingOpen(true);
  };

  const handleBookFromAIChat = (serviceName: string, estimatedCost?: number) => {
    setEstimateDataForBooking({
      services: [serviceName],
      totalEstimate: estimatedCost || 180,
      locationType: 'mobile',
    });
    setIsBookingOpen(true);
  };

  const handleOpenMembershipModal = (planId?: 'basic' | 'vip' | 'fleet') => {
    if (planId) setSelectedMembershipPlan(planId);
    setIsMembershipOpen(true);
  };

  const handleBookFromGarage = (serviceName: string, vehicleInfo: string) => {
    setEstimateDataForBooking({
      services: [serviceName],
      vehicle: vehicleInfo,
      locationType: 'mobile',
    });
    setIsBookingOpen(true);
  };

  const handleApproveDVIAndBook = (approvedServices: string[], totalCost: number) => {
    setEstimateDataForBooking({
      services: approvedServices,
      totalEstimate: totalCost,
      locationType: 'mobile',
    });
    setIsBookingOpen(true);
  };

  const handleBookMobileZip = (_zip: string) => {
    setEstimateDataForBooking({
      locationType: 'mobile',
    });
    setIsBookingOpen(true);
  };

  const handleBookingSubmittedInModal = (result: {
    bookingReference: string;
    holdAmountDollars: number;
    name: string;
    phone: string;
    vehicle: string;
  }) => {
    void refreshBookings();
    return result.bookingReference;
  };

  const pageActions = {
    onOpenBooking: openBooking,
    onOpenRecruitment: () => setIsRecruitmentOpen(true),
    onOpenPartnerApply: () => setIsPartnerApplyOpen(true),
    onOpenMembership: handleOpenMembershipModal,
    onBookWithEstimate: handleOpenBookingWithEstimate,
    onSelectRecommendedService: handleSelectRecommendedService,
    onBookService: (serviceId: string) => {
      const match = SERVICE_CATALOG.find((s) => s.id === serviceId);
      setEstimateDataForBooking({
        services: [match?.title || serviceId],
        locationType: 'mobile' as const,
      });
      setIsBookingOpen(true);
    },
    onBookAtShop: (partnerId: string) => {
      setEstimateDataForBooking({
        locationType: 'shop' as const,
        partnerLocationId: partnerId,
      });
      setIsBookingOpen(true);
    },
    onBookMobileZip: handleBookMobileZip,
    activeServiceMode,
  };

  // Public customer pay link (card or BNPL) — full-screen, no marketing chrome.
  const payReference = payReferenceFromPath(pathname);
  if (payReference) {
    return (
      <Suspense fallback={null}>
        <PayLinkPage reference={payReference} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {!adLanding && (
      <Navbar
        onOpenBooking={() => openBooking({ source: 'navbar' })}
        onOpenTracker={() => setIsTrackerOpen(true)}
        onOpenGarage={() => setIsGarageOpen(true)}
        onOpenInspection={() => setIsInspectionOpen(true)}
        onOpenRecruitment={() => setIsRecruitmentOpen(true)}
        onOpenPartnerApply={() => setIsPartnerApplyOpen(true)}
        onOpenMembership={() => {
          navigateSite('membership');
          handleOpenMembershipModal('vip');
        }}
      />
      )}

      <main className="flex-grow pb-16 md:pb-0">
        {page === 'adLanding' && adLanding ? (
          <AdLandingPage landing={adLanding} onOpenBooking={openBooking} />
        ) : page === 'home' ? (
          <HomePage
            onOpenBooking={openBooking}
            onSelectServiceMode={setActiveServiceMode}
            onOpenRecruitment={() => setIsRecruitmentOpen(true)}
            onOpenPartnerApply={() => setIsPartnerApplyOpen(true)}
          />
        ) : page === 'city' && cityLanding ? (
          <CityLandingPage city={cityLanding} onOpenBooking={openBooking} />
        ) : page === 'serviceCity' && serviceCity ? (
          <ServiceCityPage
            service={serviceCity.service}
            city={serviceCity.city}
            onOpenBooking={openBooking}
          />
        ) : page === 'referral' && referralCode ? (
          <Suspense fallback={null}>
            <ReferralLandingPage onOpenBooking={openBooking} />
          </Suspense>
        ) : page === 'blogPost' && blogSlug ? (
          <Suspense fallback={null}>
            <BlogPostPage slug={blogSlug} />
          </Suspense>
        ) : (
          <Suspense fallback={null}>
            <MarketingPage page={page} actions={pageActions} />
          </Suspense>
        )}
      </main>

      {!adLanding && (
        <>
          <Footer
            onOpenBooking={() => openBooking({ source: 'footer' })}
            onOpenTracker={() => setIsTrackerOpen(true)}
          />
          <StickyMobileActionBar onOpenBooking={() => openBooking({ source: 'sticky_mobile' })} />
        </>
      )}

      {/* Fetched on the interaction that opens them, not on first paint. */}
      <Suspense fallback={null}>
        {isWarrantyOpen && (
        <WarrantyModal
          isOpen={isWarrantyOpen}
          onClose={() => setIsWarrantyOpen(false)}
          onOpenBooking={() => openBooking({ source: 'modal' })}
        />
        )}

        {isReferralOpen && (
        <ReferralModal
          isOpen={isReferralOpen}
          onClose={() => setIsReferralOpen(false)}
        />
        )}

        {isBookingOpen && (
        <BookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          initialEstimateData={estimateDataForBooking}
          onBookingSubmitted={handleBookingSubmittedInModal}
        />
        )}

        {isTrackerOpen && (
        <RepairTrackerDemo
          isOpen={isTrackerOpen}
          onClose={() => setIsTrackerOpen(false)}
          onOpenCheckout={(booking) => {
            setCheckoutBooking(booking);
            setIsCheckoutOpen(true);
          }}
        />
        )}

        {isGarageOpen && (
        <CustomerGarageModal
          isOpen={isGarageOpen}
          onClose={() => setIsGarageOpen(false)}
          onBookService={handleBookFromGarage}
          onOpenDVIReport={() => setIsInspectionOpen(true)}
        />
        )}

        {isInspectionOpen && (
        <InspectionReportModal
          isOpen={isInspectionOpen}
          onClose={() => setIsInspectionOpen(false)}
          onApproveAndBook={handleApproveDVIAndBook}
        />
        )}

        {isRecruitmentOpen && (
        <TechRecruitmentModal
          isOpen={isRecruitmentOpen}
          onClose={() => setIsRecruitmentOpen(false)}
        />
        )}

        {isPartnerApplyOpen && (
        <PartnerApplyModal
          isOpen={isPartnerApplyOpen}
          onClose={() => setIsPartnerApplyOpen(false)}
        />
        )}

        {isMembershipOpen && (
        <MembershipModal
          isOpen={isMembershipOpen}
          onClose={() => setIsMembershipOpen(false)}
          initialPlanId={selectedMembershipPlan}
        />
        )}

        {isCheckoutOpen && (
        <PaymentCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => {
            setIsCheckoutOpen(false);
            setCheckoutBooking(null);
          }}
          bookingDetails={
            checkoutBooking
              ? {
                  id: checkoutBooking.id,
                  customerName: checkoutBooking.customerName,
                  serviceAddress: checkoutBooking.customerAddress,
                  vehicle: checkoutBooking.vehicle,
                  services: checkoutBooking.services,
                  totalAmount: checkoutBooking.totalEstimate,
                  techName: checkoutBooking.claimedBy?.name,
                  techStripeAccountId: checkoutBooking.claimedBy?.stripeAccountId ?? null,
                }
              : undefined
          }
        />
        )}
      </Suspense>

      {deferredWidgetsReady && (
        <Suspense fallback={null}>
          <AIMechanicChatbot onBookService={handleBookFromAIChat} />
        </Suspense>
      )}
    </div>
  );
}

export function App() {
  const isAdmin = useAdminConsoleRoute();
  const isPortal = usePortalRoute() || isNativeShell();

  const routeFallback = (
    <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center text-slate-400 text-sm animate-pulse">
      Loading…
    </div>
  );

  if (isAdmin) {
    return <Suspense fallback={routeFallback}><AdminApp /></Suspense>;
  }

  if (isPortal) {
    return <Suspense fallback={routeFallback}><PortalApp /></Suspense>;
  }

  return (
    <BookingProvider>
      <MainAppContent />
      <CookieConsentBanner />
    </BookingProvider>
  );
}

export default App;
