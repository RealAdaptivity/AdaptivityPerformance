import { useState } from 'react';
import { BookingProvider, useBookingContext, type Booking } from './context/BookingContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { QuoteEstimator } from './components/QuoteEstimator';
import { DiagnosticAssistant } from './components/DiagnosticAssistant';
import { ServiceAreaChecker } from './components/ServiceAreaChecker';
import { PerformanceSection } from './components/PerformanceSection';
import { SEOContentBlock } from './components/SEOContentBlock';
import { Testimonials } from './components/Testimonials';
import { RepairTrackerDemo } from './components/RepairTrackerDemo';
import { BookingModal } from './components/BookingModal';
import { CustomerGarageModal } from './components/CustomerGarageModal';
import { InspectionReportModal } from './components/InspectionReportModal';
import { TechRecruitmentModal } from './components/TechRecruitmentModal';
import { TechRecruitmentSection } from './components/TechRecruitmentSection';
import { MembershipSection } from './components/MembershipSection';
import { MembershipModal } from './components/MembershipModal';
import { PaymentCheckoutModal } from './components/PaymentCheckoutModal';
import { AIMechanicChatbot } from './components/AIMechanicChatbot';
import { Footer } from './components/Footer';
import { Capacitor } from '@capacitor/core';
import { StandaloneTechApp } from './components/StandaloneTechApp';
import { AdminApp } from './admin/AdminApp';
import { useAdminConsoleRoute } from './admin/adminRoute';
import { PortalApp } from './portal/PortalApp';
import { usePortalRoute } from './portal/portalRoute';

function MainAppContent() {
  const { refreshBookings } = useBookingContext();
  
  // Enforce Native Mobile iOS App Isolation:
  // Native iOS App (Adaptivity Tech Dispatch) opens Standalone Tech App ONLY.
  // Public website visitors on adaptivityperformance.com see Customer Website ONLY.
  const isNativeTechApp = typeof window !== 'undefined' && (
    Capacitor.isNativePlatform() || window.location.search.includes('view=tech')
  );

  const [isBookingOpen, setIsBookingOpen] = useState(false);

  if (isNativeTechApp) {
    return <StandaloneTechApp />;
  }

  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [selectedMembershipPlan, setSelectedMembershipPlan] = useState<'basic' | 'vip' | 'fleet'>('vip');
  const [activeServiceMode, setActiveServiceMode] = useState<'mobile' | 'shop'>('mobile');
  const [estimateDataForBooking, setEstimateDataForBooking] = useState<any>(null);

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

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      
      {/* Navigation */}
      <Navbar
        onOpenBooking={() => {
          setEstimateDataForBooking(null);
          setIsBookingOpen(true);
        }}
        onOpenTracker={() => setIsTrackerOpen(true)}
        onOpenGarage={() => setIsGarageOpen(true)}
        onOpenInspection={() => setIsInspectionOpen(true)}
        onOpenRecruitment={() => setIsRecruitmentOpen(true)}
        onOpenMembership={() => handleOpenMembershipModal('vip')}
      />

      <main className="flex-grow">
        {/* Hero with Service Mode Switcher */}
        <Hero
          onOpenBooking={() => {
            setEstimateDataForBooking(null);
            setIsBookingOpen(true);
          }}
          onSelectServiceMode={mode => setActiveServiceMode(mode)}
        />

        {/* Instant Quote Estimator */}
        <QuoteEstimator
          defaultMode={activeServiceMode}
          onBookWithEstimate={handleOpenBookingWithEstimate}
        />

        {/* Adaptivity Shield VIP Membership Pricing & Benefits */}
        <MembershipSection
          onOpenMembership={handleOpenMembershipModal}
        />

        {/* Smart Diagnostic Symptom Assistant */}
        <DiagnosticAssistant
          onSelectRecommendedService={handleSelectRecommendedService}
        />

        {/* Mechanic Hiring & Recruitment Banner Section */}
        <TechRecruitmentSection
          onOpenRecruitment={() => setIsRecruitmentOpen(true)}
        />

        {/* Justin & Northlake Service Area Checker */}
        <ServiceAreaChecker
          onBookMobile={handleBookMobileZip}
        />

        {/* Performance & Custom Upgrades Showcase */}
        <PerformanceSection
          onOpenBooking={() => {
            setEstimateDataForBooking(null);
            setIsBookingOpen(true);
          }}
        />

        {/* Local SEO Keyword & FAQ Block */}
        <SEOContentBlock />

        {/* Testimonials */}
        <Testimonials />
      </main>

      {/* Footer */}
      <Footer
        onOpenBooking={() => {
          setEstimateDataForBooking(null);
          setIsBookingOpen(true);
        }}
        onOpenTracker={() => setIsTrackerOpen(true)}
      />

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        initialEstimateData={estimateDataForBooking}
        onBookingSubmitted={handleBookingSubmittedInModal}
      />

      {/* Live Repair / Dispatch Tracker Modal Demo */}
      <RepairTrackerDemo
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        onOpenCheckout={(booking) => {
          setCheckoutBooking(booking);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Customer Vehicle Garage & Health Hub Modal */}
      <CustomerGarageModal
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        onBookService={handleBookFromGarage}
        onOpenDVIReport={() => setIsInspectionOpen(true)}
      />

      {/* Digital Vehicle Inspection (DVI) Report Modal */}
      <InspectionReportModal
        isOpen={isInspectionOpen}
        onClose={() => setIsInspectionOpen(false)}
        onApproveAndBook={handleApproveDVIAndBook}
      />

      {/* Mobile Mechanic Recruitment Application Modal */}
      <TechRecruitmentModal
        isOpen={isRecruitmentOpen}
        onClose={() => setIsRecruitmentOpen(false)}
      />

      {/* Adaptivity Shield VIP Membership Modal */}
      <MembershipModal
        isOpen={isMembershipOpen}
        onClose={() => setIsMembershipOpen(false)}
        initialPlanId={selectedMembershipPlan}
      />

      {/* Official In-Platform Escrow Payment Checkout Modal */}
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
                vehicle: checkoutBooking.vehicle,
                services: checkoutBooking.services,
                totalAmount: checkoutBooking.totalEstimate,
                techName: checkoutBooking.claimedBy?.name,
                techStripeAccountId: checkoutBooking.claimedBy?.stripeAccountId ?? null,
              }
            : undefined
        }
      />

      {/* Floating 24/7 AI Diagnostic Mechanic Chatbot */}
      <AIMechanicChatbot
        onBookService={handleBookFromAIChat}
      />

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
