import React from 'react';
import { AboutUsSection } from '../components/AboutUsSection';
import { ServicesSection } from '../components/ServicesSection';
import { ContactSection } from '../components/ContactSection';
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
import { RefundPolicyPage } from './RefundPolicyPage';
import { NotFoundPage } from './NotFoundPage';
import type { SitePage } from '../site/siteRoute';

type SharedActions = {
  onOpenBooking: () => void;
  onOpenRecruitment: () => void;
  onOpenPartnerApply: () => void;
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
        <ServicesSection
          onOpenBooking={actions.onOpenBooking}
          onBookService={actions.onBookService}
        />,
        'scale'
      );
    case 'contact':
      return reveal(<ContactSection onOpenBooking={actions.onOpenBooking} />);
    case 'diagnostics':
      return reveal(
        <ServicesSection
          onOpenBooking={actions.onOpenBooking}
          onBookService={actions.onBookService}
        />,
        'scale'
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
      return <TermsPrivacyPage />;
    case 'privacy':
      return <PrivacyPolicyPage />;
    case 'refunds':
      return <RefundPolicyPage />;
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
