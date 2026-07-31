import { useEffect, useState } from 'react';
import { BookingProvider, useBookingContext, type Booking } from './context/BookingContext';
import { Navbar } from './components/Navbar';
import { RepairTrackerDemo } from './components/RepairTrackerDemo';
import { BookingModal } from './components/BookingModal';
import { CustomerGarageModal } from './components/CustomerGarageModal';
import { InspectionReportModal } from './components/InspectionReportModal';
import { TechRecruitmentModal } from './components/TechRecruitmentModal';
import { PartnerApplyModal } from './components/PartnerApplyModal';
import { MembershipModal } from './components/MembershipModal';
import { PaymentCheckoutModal } from './components/PaymentCheckoutModal';
import { WarrantyModal } from './components/WarrantyModal';
import { ReferralModal } from './components/ReferralModal';
import { StickyMobileActionBar } from './components/StickyMobileActionBar';
import { AIMechanicChatbot } from './components/AIMechanicChatbot';
import { Footer } from './components/Footer';
import { Capacitor } from '@capacitor/core';
import { StandaloneTechApp } from './components/StandaloneTechApp';
import { AdminApp } from './admin/AdminApp';
import { useAdminConsoleRoute } from './admin/adminRoute';
import { PortalApp } from './portal/PortalApp';
import { usePortalRoute } from './portal/portalRoute';
import { SERVICE_CATALOG } from './services/serviceCatalog';
import { HomePage } from './pages/HomePage';
import { renderMarketingPage } from './pages/MarketingPages';
import { navigateSite, useSitePage, useSitePathname } from './site/siteRoute';
import {
  applyDocumentSeo,
  cityFromPath,
  citySeo,
  PAGE_SEO,
} from './site/seo';
import { CityLandingPage } from './pages/CityLandingPage';
import { BlogPostPage } from './pages/BlogPostPage';
import { ReferralLandingPage, referralCodeFromPath } from './pages/ReferralLandingPage';
import { blogSlugFromPath } from './services/blog';

function MainAppContent() {
  const { refreshBookings } = useBookingContext();
  const page = useSitePage();
  const pathname = useSitePathname();
  const cityLanding = cityFromPath(pathname);
  const blogSlug = blogSlugFromPath(pathname);
  const referralCode = referralCodeFromPath(pathname);

  useEffect(() => {
    if (page === 'city' && cityLanding) {
      applyDocumentSeo(citySeo(cityLanding));
      return;
    }
    if (page === 'blogPost') {
      // BlogPostPage applies post-specific SEO once loaded
      applyDocumentSeo(PAGE_SEO.blogPost);
      return;
    }
    if (page === 'referral') {
      return;
    }
    applyDocumentSeo(PAGE_SEO[page as keyof typeof PAGE_SEO] || PAGE_SEO.home);
  }, [page, cityLanding]);

  const isNativeTechApp =
    typeof window !== 'undefined' &&
    (Capacitor.isNativePlatform() || window.location.search.includes('view=tech'));

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
      estimator: 'quotes',
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

  if (isNativeTechApp) {
    return <StandaloneTechApp />;
  }

  const openBooking = (opts?: { referralCode?: string }) => {
    setEstimateDataForBooking({
      locationType: 'mobile',
      ...(opts?.referralCode ? { referralCode: opts.referralCode } : {}),
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
      vehicle: '2021 Ford F-150 SuperCrew',
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

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      <Navbar
        onOpenBooking={openBooking}
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

      <main className="flex-grow pb-16 md:pb-0">
        {page === 'home' ? (
          <HomePage
            onOpenBooking={openBooking}
            onSelectServiceMode={setActiveServiceMode}
            onOpenRecruitment={() => setIsRecruitmentOpen(true)}
            onOpenPartnerApply={() => setIsPartnerApplyOpen(true)}
          />
        ) : page === 'city' && cityLanding ? (
          <CityLandingPage city={cityLanding} onOpenBooking={openBooking} />
        ) : page === 'referral' && referralCode ? (
          <ReferralLandingPage onOpenBooking={openBooking} />
        ) : page === 'blogPost' && blogSlug ? (
          <BlogPostPage slug={blogSlug} />
        ) : (
          renderMarketingPage(page, pageActions)
        )}
      </main>

      <Footer onOpenBooking={openBooking} onOpenTracker={() => setIsTrackerOpen(true)} />

      <StickyMobileActionBar onOpenBooking={openBooking} />

      <WarrantyModal
        isOpen={isWarrantyOpen}
        onClose={() => setIsWarrantyOpen(false)}
        onOpenBooking={openBooking}
      />

      <ReferralModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
      />

      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        initialEstimateData={estimateDataForBooking}
        onBookingSubmitted={handleBookingSubmittedInModal}
      />

      <RepairTrackerDemo
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        onOpenCheckout={(booking) => {
          setCheckoutBooking(booking);
          setIsCheckoutOpen(true);
        }}
      />

      <CustomerGarageModal
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        onBookService={handleBookFromGarage}
        onOpenDVIReport={() => setIsInspectionOpen(true)}
      />

      <InspectionReportModal
        isOpen={isInspectionOpen}
        onClose={() => setIsInspectionOpen(false)}
        onApproveAndBook={handleApproveDVIAndBook}
      />

      <TechRecruitmentModal
        isOpen={isRecruitmentOpen}
        onClose={() => setIsRecruitmentOpen(false)}
      />

      <PartnerApplyModal
        isOpen={isPartnerApplyOpen}
        onClose={() => setIsPartnerApplyOpen(false)}
      />

      <MembershipModal
        isOpen={isMembershipOpen}
        onClose={() => setIsMembershipOpen(false)}
        initialPlanId={selectedMembershipPlan}
      />

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

      <AIMechanicChatbot onBookService={handleBookFromAIChat} />
    </div>
  );
}

export function App() {
  const isAdmin = useAdminConsoleRoute();
  const isPortal = usePortalRoute();

  if (isAdmin) {
    return <AdminApp />;
  }

  if (isPortal) {
    return <PortalApp />;
  }

  return (
    <BookingProvider>
      <MainAppContent />
    </BookingProvider>
  );
}

export default App;
