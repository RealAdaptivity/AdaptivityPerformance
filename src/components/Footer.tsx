import React from 'react';
import { Wrench, Phone, MapPin, ShieldCheck, Mail, Smartphone } from 'lucide-react';
import { StoreBadgeLinks } from './StoreBadgeLinks';
import { SiteLink } from '../site/SiteLink';

interface FooterProps {
  onOpenBooking: () => void;
  onOpenTracker: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenBooking, onOpenTracker }) => {
  return (
    <footer className="bg-[#08090d] text-slate-400 text-xs border-t border-white/10 pt-16 pb-12 relative overflow-hidden">
      
      {/* Emergency Hotline Banner */}
      <div className="container mx-auto px-4 mb-16">
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-orange-500/20 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-[10px] bg-black/30 px-3 py-1 rounded-full font-extrabold uppercase tracking-widest text-amber-200">
              Emergency Roadside Dispatch
            </span>
            <h3 className="font-heading text-2xl sm:text-3xl font-extrabold">Stranded in DFW or Fort Worth?</h3>
            <p className="text-sm text-amber-100 max-w-xl">
              Dead battery, flat tire, or sudden check engine light on I-35W / FM 407? Mobile unit available for rapid dispatch.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <a
              href="tel:2146203244"
              className="w-full sm:w-auto px-6 py-3.5 bg-black hover:bg-slate-900 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
            >
              <Phone className="w-4 h-4 text-orange-400" />
              <span>Call (214) 620-3244</span>
            </a>
            <button
              onClick={onOpenBooking}
              className="w-full sm:w-auto px-6 py-3.5 bg-white text-orange-600 hover:bg-slate-100 font-extrabold text-sm rounded-xl transition-all shadow-lg"
            >
              Book Mobile Van Now
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="font-heading font-extrabold text-lg text-white">
              ADAPTIVITY <span className="text-orange-500">PERFORMANCE</span>
            </span>
          </div>

          <p className="text-slate-400 leading-relaxed">
            DFW / Fort Worth’s premier mobile auto repair and Justin garage performance specialist. Quality OE parts, transparent pricing, and 12-month nationwide warranty on all work.
          </p>

          <div className="flex items-center space-x-3 text-white font-semibold pt-1">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
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
            <li><SiteLink to="quotes" className="hover:text-orange-400 transition-colors">Instant Quotes</SiteLink></li>
            <li><SiteLink to="diagnostics" className="hover:text-orange-400 transition-colors">Symptom Checker</SiteLink></li>
            <li><SiteLink to="join" className="hover:text-orange-400 transition-colors">Join as Tech</SiteLink></li>
            <li><SiteLink to="learn" className="hover:text-orange-400 transition-colors">Want to Learn</SiteLink></li>
            <li><SiteLink to="wantToTeach" className="hover:text-orange-400 transition-colors">Want to Teach</SiteLink></li>
            <li><SiteLink to="careers" className="hover:text-orange-400 transition-colors">Careers</SiteLink></li>
            <li><SiteLink to="partners" className="hover:text-orange-400 transition-colors">Shop & garage partners</SiteLink></li>
            <li><SiteLink to="coverage" className="hover:text-orange-400 transition-colors">DFW / Fort Worth coverage</SiteLink></li>
            <li><SiteLink to="performance" className="hover:text-orange-400 transition-colors">Truck Lifts & Upgrades</SiteLink></li>
            <li><SiteLink to="faq" className="hover:text-orange-400 transition-colors">FAQ</SiteLink></li>
            <li><button onClick={onOpenTracker} className="text-orange-400 hover:underline">Track Live Repair / Dispatch</button></li>
          </ul>
        </div>

        {/* Hours */}
        <div className="space-y-3">
          <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider">Operating Hours</h4>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span>Monday - Friday:</span>
              <span className="font-bold text-white">7:00 AM - 7:00 PM</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span>Saturday:</span>
              <span className="font-bold text-white">8:00 AM - 5:00 PM</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span>Sunday:</span>
              <span className="text-orange-400 font-bold">Emergency Mobile Only</span>
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
              <a href="tel:2146203244" className="font-bold text-white hover:text-orange-400">(214) 620-3244</a>
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
          <span className="bg-slate-900 border border-white/10 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
            🔒 Powered by Stripe Connect
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Terms of Service</span>
          <span>Privacy Policy</span>
          <span>12-Month Warranty</span>
        </div>
      </div>
    </footer>
  );
};
