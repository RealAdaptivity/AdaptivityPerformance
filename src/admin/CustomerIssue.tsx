import React, { useEffect, useState } from 'react';
import { ImageIcon, MessageSquareQuote } from 'lucide-react';
import { signedMediaUrls } from '../services/bookingMediaApi';

type Media = { path: string; url: string; isVideo: boolean };

/**
 * What the customer typed about the problem when they booked, and any photos
 * or videos they attached. The tech app has always shown this ("Customer
 * says"); Dispatch never loaded it.
 */
export const CustomerIssue: React.FC<{ issue?: string | null; mediaPaths?: string[] }> = ({ issue, mediaPaths }) => {
  const [media, setMedia] = useState<Media[]>([]);
  const paths = mediaPaths ?? [];
  const key = paths.join('|');

  useEffect(() => {
    let cancelled = false;
    setMedia([]);
    if (!key) return;
    void signedMediaUrls(key.split('|')).then((m) => {
      if (!cancelled) setMedia(m);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const text = issue?.trim();
  if (!text && !paths.length) {
    return <p className="text-[11px] text-slate-500">The customer didn’t describe the problem.</p>;
  }

  return (
    <div className="rounded-xl bg-[#0b0c10] border border-white/10 p-3 space-y-2">
      <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
        <MessageSquareQuote className="w-3 h-3" /> Customer says
      </p>
      {text && <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap break-words">“{text}”</p>}
      {paths.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> {paths.length} photo{paths.length === 1 ? '' : 's'} / video
            {paths.length === 1 ? '' : 's'} from the customer
          </p>
          <div className="flex flex-wrap gap-2">
            {media.map((m) =>
              m.isVideo ? (
                <a
                  key={m.path}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-20 w-20 items-center justify-center rounded-lg border border-white/10 text-[11px] font-bold text-orange-300"
                >
                  Video
                </a>
              ) : (
                <a key={m.path} href={m.url} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={m.url}
                    alt="Photo from the customer"
                    loading="lazy"
                    className="h-20 w-20 rounded-lg border border-white/10 object-cover"
                  />
                </a>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
