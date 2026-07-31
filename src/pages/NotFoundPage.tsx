import React from 'react';
import { navigateSite } from '../site/siteRoute';
import { Wrench, Home, Phone, MapPin } from 'lucide-react';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#08090d] flex items-center justify-center px-4 py-20">
      <div className="max-w-xl w-full text-center space-y-8">

        {/* Animated wrench icon */}
        <div className="relative mx-auto w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-orange-500/10 border border-orange-500/20 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-orange-500/10 border border-orange-500/20 animate-pulse [animation-delay:0.3s]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Wrench className="w-14 h-14 text-orange-500 animate-[spin_8s_linear_infinite]" />
          </div>
        </div>

        {/* Error text */}
        <div className="space-y-3">
          <div className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400 font-heading">
            404
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            Page Not Found
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            Looks like this page drove off the lot. Let's get you back on the road — our mobile mechanics are standing by in the DFW area.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="not-found-home-btn"
            onClick={() => navigateSite('home')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </button>
          <a
            id="not-found-call-btn"
            href={SITE_PHONE_TEL}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm rounded-xl transition-all"
          >
            <Phone className="w-4 h-4 text-orange-400" />
            Call Us: {SITE_PHONE_DISPLAY}
          </a>
        </div>

        {/* Quick links */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Quick Links</p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            {([
              ['Book Service', 'home'],
              ['Services', 'services'],
              ['Get a Quote', 'quotes'],
              ['About Us', 'about'],
              ['Coverage Area', 'coverage'],
              ['FAQ', 'faq'],
            ] as [string, Parameters<typeof navigateSite>[0]][]).map(([label, page]) => (
              <button
                key={page}
                onClick={() => navigateSite(page)}
                className="px-3 py-1.5 bg-white/5 hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 text-slate-300 hover:text-orange-400 rounded-lg transition-all"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Location badge */}
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 text-orange-400" />
          Mobile Mechanic Serving Justin, Northlake, Argyle & DFW
        </div>

      </div>
    </div>
  );
};
