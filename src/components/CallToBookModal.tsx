import React, { useEffect, useRef } from 'react';
import { MessageSquare, Phone, X } from 'lucide-react';
import { BUSINESS_HOURS, SITE_PHONE_DISPLAY, SITE_PHONE_E164, SITE_PHONE_TEL } from '../site/seo';
import { CONVERSION_EVENTS, trackEvent } from '../site/analytics';
import { DIAGNOSTIC_FEE_DOLLARS } from '../services/serviceCatalog';

/** Label for every button that used to open the online booking form. */
export const CALL_TO_BOOK_LABEL = 'Call to book';

/**
 * Booking is by phone now: every "book" button on the site opens this instead
 * of the online form. A person takes the call and books the visit from the
 * dispatch board or the tech portal.
 */
export const CallToBookModal: React.FC<{
  onClose: () => void;
  /** Where the button that opened it was, for analytics (never anything the customer typed). */
  source: string;
  /** A service the button was for, so the text message can name it. */
  service?: string;
}> = ({ onClose, source, service }) => {
  const callRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    callRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const smsBody = encodeURIComponent(
    `Hi Adaptivity - I'd like to book${service ? ` ${service}` : ' a visit'}. My vehicle is: `
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-to-book-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-white/[0.11] bg-[#12141c] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 id="call-to-book-title" className="font-heading text-2xl font-bold tracking-tight text-white">
          Call to book
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-300">
          A real person books your visit and gives you a time on the call{service ? ` for ${service}` : ''}. Have
          your vehicle’s year, make and model handy.
        </p>
        <a
          ref={callRef}
          href={SITE_PHONE_TEL}
          onClick={() => trackEvent(CONVERSION_EVENTS.callClicked, { source: `call_to_book_${source}` })}
          className="mt-5 flex min-h-[60px] w-full items-center justify-center gap-2.5 rounded-2xl bg-brand text-lg font-extrabold text-[#0b0c10] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Phone className="h-5 w-5" aria-hidden="true" /> Call {SITE_PHONE_DISPLAY}
        </a>
        <a
          href={`sms:${SITE_PHONE_E164}?body=${smsBody}`}
          onClick={() => trackEvent(CONVERSION_EVENTS.textClicked, { source: `call_to_book_${source}` })}
          className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.14] text-base font-bold text-slate-100 hover:border-white/30"
        >
          <MessageSquare className="h-5 w-5" aria-hidden="true" /> Or text us
        </a>
        <p className="mt-4 text-center text-[13px] text-slate-400">
          Open {BUSINESS_HOURS.label} · ${DIAGNOSTIC_FEE_DOLLARS} diagnostic visit, nothing charged on the phone
        </p>
      </div>
    </div>
  );
};
