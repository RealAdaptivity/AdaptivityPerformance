import React from 'react';
import { Phone, MapPin, Mail, Smartphone } from 'lucide-react';
import { StoreBadgeLinks } from './StoreBadgeLinks';
import { AseLogo } from './AseLogo';
import { SiteLink } from '../site/SiteLink';
import { CITY_LANDINGS, cityPath, SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';

interface FooterProps {
  onOpenBooking: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenBooking }) => {
  return (
    <footer className="bg-[#08090d] text-slate-400 text-xs border-t border-white/10 pt-16 pb-12 relative overflow-hidden">
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
            DFW / Fort Worth’s premier mobile auto repair and Justin garage performance specialist. Quality OE parts, zero-down online booking, transparent on-site pricing, and 12-month nationwide warranty on all work.
          </p>

          <div className="flex items-center space-x-2.5 text-white font-semibold pt-1">
            <AseLogo className="w-5 h-5 flex-shrink-0" />
            <span>ASE Certified Technicians</span>
          </div>

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
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">Quick Navigation</h4>
          <ul className="space-y-2">
            <li><SiteLink to="about" className="hover:text-orange-400 transition-colors">About Us</SiteLink></li>
            <li><SiteLink to="about" hash="future" className="hover:text-orange-400 transition-colors">Future plans</SiteLink></li>
            <li><SiteLink to="services" className="hover:text-orange-400 transition-colors">Services</SiteLink></li>
            <li><SiteLink to="contact" className="hover:text-orange-400 transition-colors">Contact Us</SiteLink></li>
            <li><SiteLink to="join" className="hover:text-orange-400 transition-colors">Join as Tech</SiteLink></li>
            <li><SiteLink to="learn" className="hover:text-orange-400 transition-colors">Want to Learn</SiteLink></li>
            <li><SiteLink to="wantToTeach" className="hover:text-orange-400 transition-colors">Want to Teach</SiteLink></li>
            <li><SiteLink to="careers" className="hover:text-orange-400 transition-colors">Careers</SiteLink></li>
            <li><SiteLink to="partners" className="hover:text-orange-400 transition-colors">Shop & garage partners</SiteLink></li>
            <li><SiteLink to="coverage" className="hover:text-orange-400 transition-colors">DFW / Fort Worth coverage</SiteLink></li>
            <li><SiteLink to="performance" className="hover:text-orange-400 transition-colors">Truck Lifts & Upgrades</SiteLink></li>
            <li><SiteLink to="faq" className="hover:text-orange-400 transition-colors">FAQ</SiteLink></li>
            <li><button onClick={onOpenBooking} className="hover:text-orange-400 transition-colors">Book Service Online</button></li>
          </ul>
        </div>

        {/* Hours */}
        <div className="space-y-3">
          <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">Operating Hours</h4>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span>Every day:</span>
              <span className="font-bold text-white">8AM–10PM</span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              Mobile dispatch every day, 8AM–10PM, across our DFW coverage area.
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
          <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">Garage & Dispatch Location</h4>
          <div className="space-y-2 text-slate-300">
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Shop Base:</strong> 410 FM 156, Justin, TX 76247
                <p className="text-[11px] text-slate-500">Dispatching across DFW / Fort Worth (zips 750–752, 760–762)</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Phone className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <a href={SITE_PHONE_TEL} className="font-bold text-white hover:text-orange-400">{SITE_PHONE_DISPLAY}</a>
            </div>

            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <span>service@adaptivityperformance.com</span>
            </div>
          </div>
        </div>

      </div>

      <div className="container mx-auto px-4 mt-12 pt-6 border-t border-white/5 text-center text-slate-500 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span>© 2026 Adaptivity Performance LLC. Servicing Justin, Northlake & DFW.</span>
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
