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
import { ScrollReveal } from '../components/ScrollReveal';
import { JoinAsTechPage } from './JoinAsTechPage';
import { CareersPage } from './CareersPage';
import { WantToLearnPage } from './WantToLearnPage';
import { WantToTeachPage } from './WantToTeachPage';
import { BlogIndexPage } from './BlogIndexPage';
import { TermsPrivacyPage } from './TermsPrivacyPage';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';
import { NotFoundPage } from './NotFoundPage';
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

function reveal(node: React.ReactNode, variant: 'up' | 'fade' | 'scale' = 'up') {
  return <ScrollReveal variant={variant}>{node}</ScrollReveal>;
}

export function renderMarketingPage(page: SitePage, actions: SharedActions): React.ReactNode {
  switch (page) {
    case 'about':
      return reveal(
        <AboutUsSection
          onOpenBooking={actions.onOpenBooking}
          onOpenRecruitment={actions.onOpenRecruitment}
          onOpenPartnerApply={actions.onOpenPartnerApply}
        />
      );
    case 'services':
      return reveal(
        <ServicesSection
          onOpenBooking={actions.onOpenBooking}
          onBookService={actions.onBookService}
        />,
        'scale'
      );
    case 'quotes':
      return reveal(
        <QuoteEstimator
          defaultMode={actions.activeServiceMode}
          onBookWithEstimate={actions.onBookWithEstimate}
        />
      );
    case 'membership':
      return reveal(<MembershipSection onOpenMembership={actions.onOpenMembership} />);
    case 'diagnostics':
      return reveal(
        <DiagnosticAssistant onSelectRecommendedService={actions.onSelectRecommendedService} />
      );
    case 'join':
      return reveal(
        <JoinAsTechPage
          onOpenRecruitment={actions.onOpenRecruitment}
          onOpenPartnerApply={actions.onOpenPartnerApply}
        />
      );
    case 'wantToTeach':
      return reveal(<WantToTeachPage onOpenRecruitment={actions.onOpenRecruitment} />);
    case 'learn':
      return reveal(<WantToLearnPage onOpenRecruitment={actions.onOpenRecruitment} />);
    case 'careers':
      return reveal(
        <CareersPage
          onOpenRecruitment={actions.onOpenRecruitment}
          onOpenPartnerApply={actions.onOpenPartnerApply}
        />
      );
    case 'partners':
      return reveal(
        <PartnerNetworkSection
          onOpenPartnerApply={actions.onOpenPartnerApply}
        />,
        'scale'
      );
    case 'coverage':
      return reveal(<ServiceAreaChecker onBookMobile={actions.onBookMobileZip} />);
    case 'performance':
      return reveal(<PerformanceSection onOpenBooking={actions.onOpenBooking} />);
    case 'faq':
      return reveal(<SEOContentBlock />, 'fade');
    case 'blog':
      return reveal(<BlogIndexPage />);
    case 'terms':
      return reveal(<TermsPrivacyPage />, 'fade');
    case 'privacy':
      return reveal(<PrivacyPolicyPage />, 'fade');
    case 'notFound':
      return <NotFoundPage />;
    case 'blogPost':
    case 'city':
    case 'home':
      return null;
    default:
      return <NotFoundPage />;
  }
}
