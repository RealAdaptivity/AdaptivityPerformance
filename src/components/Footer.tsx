import React from 'react';
import { LOCAL_HUB } from '../site/localSeo';
import { Phone, MapPin, ShieldCheck, Mail, Smartphone, Star } from 'lucide-react';
import { StoreBadgeLinks } from './StoreBadgeLinks';
import { SiteLink } from '../site/SiteLink';
import { BUSINESS_EMAIL, LEGAL_ENTITY_ADDRESS, LEGAL_ENTITY_NAME } from '../content/businessIdentity';
import { CUSTOMER_APP_LIVE } from '../config/customerAppLinks';
import { BUSINESS_HOURS, CITY_LANDINGS, GOOGLE_RATING, GOOGLE_REVIEW_URL, SITE_PHONE_DISPLAY, SITE_PHONE_TEL, SOCIAL_PROFILES, cityPath } from '../site/seo';

interface FooterProps {
  onOpenBooking: () => void;
  onOpenTracker: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenBooking, onOpenTracker }) => {
  /* The footer's bottom padding clears the fixed mobile action bar. The footer
     sits after </main>, so main's padding never lifted it: the bar is 72px and
     the footer's own pb-12 was 48px, leaving the last line — the Privacy and
     Terms links — under the bar and untappable on every page. env() adds the
     iOS home-indicator inset, which Chromium reports as 0 and a real iPhone
     does not. md: drops it again; the bar is mobile-only. */
  return (
    <footer className="bg-[#08090d] text-slate-400 text-xs border-t border-white/10 pt-16 pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-12 relative overflow-hidden">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <img
              src={`${(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}logo-ui.png`}
              alt="Adaptivity Performance"
              className="w-8 h-8 rounded-lg object-cover bg-[#0b0c10]"
            />
            <span className="font-heading font-extrabold text-lg text-white">
              ADAPTIVITY <span className="text-orange-500">PERFORMANCE</span>
            </span>
          </div>

          <p className="text-slate-400 leading-relaxed">
            Mobile auto repair from Justin, TX. ASE-certified technicians come to your driveway or workplace anywhere within {LOCAL_HUB.radiusMiles} miles — a $100 diagnostic, a price you approve before any work, and a 12-month / 12,000-mile warranty.
          </p>

          <div className="flex items-center space-x-3 text-white font-semibold pt-1">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <span>ASE-certified technicians</span>
          </div>
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 text-white font-semibold hover:text-orange-300"
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{GOOGLE_RATING} on Google</span>
          </a>

          {CUSTOMER_APP_LIVE && (
            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
                <Smartphone className="w-4 h-4 text-orange-400" />
                <span>Customer Mobile App</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Book service, manage your garage, and track repairs from your phone.
              </p>
              <StoreBadgeLinks size="sm" />
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">For customers</h4>
          <ul className="space-y-2">
            <li><button type="button" onClick={onOpenBooking} className="hover:text-orange-400 transition-colors">Book a visit</button></li>
            <li><button type="button" onClick={onOpenTracker} className="hover:text-orange-400 transition-colors">Track my repair</button></li>
            <li><SiteLink to="services" className="hover:text-orange-400 transition-colors">Services &amp; prices</SiteLink></li>
            <li><SiteLink to="coverage" className="hover:text-orange-400 transition-colors">Service area — {LOCAL_HUB.radiusMiles} miles from Justin</SiteLink></li>
            <li><SiteLink to="faq" className="hover:text-orange-400 transition-colors">FAQ</SiteLink></li>
            <li><SiteLink to="about" className="hover:text-orange-400 transition-colors">About us</SiteLink></li>
            <li><SiteLink to="contact" className="hover:text-orange-400 transition-colors">Contact</SiteLink></li>
          </ul>
          <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider pt-4">Work with us</h4>
          <ul className="space-y-2">
            <li><SiteLink to="join" className="hover:text-orange-400 transition-colors">Join as a technician</SiteLink></li>
            <li><SiteLink to="careers" className="hover:text-orange-400 transition-colors">Careers</SiteLink></li>
            <li><SiteLink to="partners" className="hover:text-orange-400 transition-colors">Partner with us</SiteLink></li>
          </ul>
        </div>

        {/* Hours */}
        <div className="space-y-3">
          <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">Operating Hours</h4>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span>Every day:</span>
              <span className="font-bold text-white">{BUSINESS_HOURS.label}</span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              Mobile dispatch every day, {BUSINESS_HOURS.label}, anywhere inside our {LOCAL_HUB.radiusMiles}-mile radius.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">City pages</h4>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {CITY_LANDINGS.map((city) => (
                <a
                  key={city.slug}
                  href={cityPath(city.slug)}
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', cityPath(city.slug));
                    window.dispatchEvent(new PopStateEvent('popstate'));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-orange-400 transition-colors"
                >
                  {city.city}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Location Info */}
        <div className="space-y-3">
          <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">Contact</h4>
          <div className="space-y-2 text-slate-300">
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Mobile only — we come to you</strong>
                <p className="text-[11px] text-slate-500">
                  Anywhere within {LOCAL_HUB.radiusMiles} miles of Justin, TX ({LOCAL_HUB.zip}). Business address: {LEGAL_ENTITY_ADDRESS} — not a drop-off location.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Phone className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <a href={SITE_PHONE_TEL} className="font-bold text-white hover:text-orange-400">{SITE_PHONE_DISPLAY}</a>
            </div>

            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <a href={`mailto:${BUSINESS_EMAIL}`} className="hover:text-orange-400">{BUSINESS_EMAIL}</a>
            </div>

            {/* Real crawlable links to the same profiles the business schema
                lists in sameAs. A search engine corroborates the entity from
                both, so the two must not disagree. */}
            <div className="flex items-center gap-4 pt-2">
              {SOCIAL_PROFILES.map(({ label, url }) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer me"
                  className="hover:text-orange-400 transition-colors font-semibold"
                >
                  {label}
                </a>
              ))}
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-orange-400 transition-colors font-semibold"
              >
                Review us on Google
              </a>
            </div>
          </div>
        </div>

      </div>

      <div className="container mx-auto px-4 mt-12 pt-6 border-t border-white/5 text-center text-slate-500 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span>© 2026 {LEGAL_ENTITY_NAME}. Servicing Justin, Northlake, Argyle, Denton &amp; {LOCAL_HUB.radiusMiles} miles around.</span>
          <span className="bg-slate-900 border border-white/10 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
            🔒 Card payments taken in person
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <SiteLink to="terms" className="hover:text-orange-400 transition-colors">Terms of Service</SiteLink>
          <SiteLink to="privacy" className="hover:text-orange-400 transition-colors">Privacy Policy</SiteLink>
          <SiteLink to="refunds" className="hover:text-orange-400 transition-colors">Refund Policy</SiteLink>
          <SiteLink to="about" hash="warranty" className="hover:text-orange-400 transition-colors">12-Month Warranty</SiteLink>
        </div>
      </div>
    </footer>
  );
};
