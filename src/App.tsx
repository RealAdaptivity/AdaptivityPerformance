import { useState } from 'react';
import { BookingProvider, useBookingContext } from './context/BookingContext';
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
import { StandaloneTechApp } from './components/StandaloneTechApp';

function MainAppContent() {
  const { addBooking } = useBookingContext();
  
  // Check if URL specifies tech view (e.g. ?view=tech or standalone app)
  const isUrlTechView = typeof window !== 'undefined' && window.location.search.includes('view=tech');
  const [currentView, setCurrentView] = useState<'customer' | 'tech'>(isUrlTechView ? 'tech' : 'customer');
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  if (currentView === 'tech') {
    return <StandaloneTechApp onSwitchToCustomerSite={() => setCurrentView('customer')} />;
  }

  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
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

  const handleBookingSubmittedInModal = (bookingData: any) => {
    // Register booking into shared BookingContext
    const createdId = addBooking({
      customerName: bookingData.name || 'Local Customer',
      customerPhone: bookingData.phone || '(214) 620-3244',
      customerAddress: bookingData.address || 'Justin / Northlake Area',
      zipCode: bookingData.zip || '76247',
      vehicle: bookingData.vehicle || '2021 Ford F-150',
      vin: bookingData.vin,
      services: bookingData.services || ['General Maintenance'],
      totalEstimate: bookingData.totalEstimate || 250,
      locationType: bookingData.locationType || 'mobile',
      distanceMiles: bookingData.distanceMiles || 5.0,
      etaMinutes: 12,
    });
    return createdId;
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      
      {/* Navigation */}
      <Navbar
        currentView={currentView}
        onToggleView={view => setCurrentView(view)}
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
        onOpenCheckout={() => setIsCheckoutOpen(true)}
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
        onClose={() => setIsCheckoutOpen(false)}
      />

      {/* Floating 24/7 AI Diagnostic Mechanic Chatbot */}
      <AIMechanicChatbot
        onBookService={handleBookFromAIChat}
      />

    </div>
  );
}

export function App() {
  return (
    <BookingProvider>
      <MainAppContent />
    </BookingProvider>
  );
}

export default App;
