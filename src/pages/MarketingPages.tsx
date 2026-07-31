import React from 'react';
import { AboutUsSection } from '../components/AboutUsSection';
import { ServicesSection } from '../components/ServicesSection';
import { QuoteEstimator } from '../components/QuoteEstimator';
import { MembershipSection } from '../components/MembershipSection';
import { DiagnosticAssistant } from '../components/DiagnosticAssistant';
import { PartnerNetworkSection } from '../components/PartnerNetworkSection';
import { ServiceAreaChecker } from '../components/ServiceAreaChecker';
import { PerformanceSection } from '../components/PerformanceSection';
import { SEOContentBlock } from '../components/SEOContentBlock';
import { JoinAsTechPage } from './JoinAsTechPage';
import { CareersPage } from './CareersPage';
import { WantToLearnPage } from './WantToLearnPage';
import { WantToTeachPage } from './WantToTeachPage';
import { BlogIndexPage } from './BlogIndexPage';
import { TermsPrivacyPage } from './TermsPrivacyPage';
import type { SitePage } from '../site/siteRoute';

type SharedActions = {
  onOpenBooking: () => void;
  onOpenRecruitment: () => void;
  onOpenPartnerApply: () => void;
  onOpenMembership: (planId?: 'basic' | 'vip' | 'fleet') => void;
  onBookWithEstimate: (estimateDetails: unknown) => void;
  onSelectRecommendedService: (serviceName: string) => void;
  onBookService: (serviceId: string) => void;
  onBookAtShop: (partnerId: string) => void;
  onBookMobileZip: (zip: string) => void;
  activeServiceMode: 'mobile' | 'shop';
};

export function renderMarketingPage(page: SitePage, actions: SharedActions): React.ReactNode {
  switch (page) {
    case 'about':
      return (
        <AboutUsSection
          onOpenBooking={actions.onOpenBooking}
          onOpenRecruitment={actions.onOpenRecruitment}
          onOpenPartnerApply={actions.onOpenPartnerApply}
        />
      );
    case 'services':
      return (
        <ServicesSection
          onOpenBooking={actions.onOpenBooking}
          onBookService={actions.onBookService}
        />
      );
    case 'quotes':
      return (
        <QuoteEstimator
          defaultMode={actions.activeServiceMode}
          onBookWithEstimate={actions.onBookWithEstimate}
        />
      );
    case 'membership':
      return <MembershipSection onOpenMembership={actions.onOpenMembership} />;
    case 'diagnostics':
      return (
        <DiagnosticAssistant onSelectRecommendedService={actions.onSelectRecommendedService} />
      );
    case 'join':
      return (
        <JoinAsTechPage
          onOpenRecruitment={actions.onOpenRecruitment}
          onOpenPartnerApply={actions.onOpenPartnerApply}
        />
      );
    case 'wantToTeach':
      return <WantToTeachPage onOpenRecruitment={actions.onOpenRecruitment} />;
    case 'learn':
      return <WantToLearnPage onOpenRecruitment={actions.onOpenRecruitment} />;
    case 'careers':
      return (
        <CareersPage
          onOpenRecruitment={actions.onOpenRecruitment}
          onOpenPartnerApply={actions.onOpenPartnerApply}
        />
      );
    case 'partners':
      return (
        <PartnerNetworkSection
          onOpenPartnerApply={actions.onOpenPartnerApply}
          onBookAtShop={actions.onBookAtShop}
        />
      );
    case 'coverage':
      return <ServiceAreaChecker onBookMobile={actions.onBookMobileZip} />;
    case 'performance':
      return <PerformanceSection onOpenBooking={actions.onOpenBooking} />;
    case 'faq':
      return <SEOContentBlock />;
    case 'blog':
      return <BlogIndexPage />;
    case 'terms':
      return <TermsPrivacyPage />;
    case 'blogPost':
    case 'city':
    case 'home':
      return null;
    default:
      return null;
  }
}
