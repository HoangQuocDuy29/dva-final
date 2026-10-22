import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, ShieldCheck, ExternalLink, QrCode, ChevronRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#080C14] text-slate-400 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 space-y-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Col 1: Club Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-red-950 shrink-0">
                <img
                  src="/logo.png"
                  alt="DVA Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const fallback = (e.target as HTMLElement).nextElementSibling;
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }}
                />
                <span className="font-black text-white text-sm hidden items-center justify-center w-full h-full">
                  DVA
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-black text-base text-white tracking-wide">
                  DVA VOLLEYBALL CLUB
                </span>
                <span className="text-[10px] tracking-widest text-slate-500 uppercase font-bold">
                  Premier Volleyball Center
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Official FIVB-grade Taraflex sports arena and professional coaching academy. Home of elite regional championship squads and aspiring youth volleyball athletes.
            </p>

            <div className="space-y-2 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
                <span>100% Olympic Match Ball Standard (Mikasa V200W)</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                <span>Operating Hours: 06:00 - 21:30 (Mon – Sun)</span>
              </div>
            </div>

            {/* MB Bank Beneficiary Card */}
            <div className="bg-[#121826] border border-slate-800 rounded-2xl p-4 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <QrCode className="w-4 h-4 text-red-500" />
                <span>Official VietQR Payment Account:</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Bank:</span>
                <span className="font-semibold text-white">MB Bank (Military Bank)</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Account No:</span>
                <span className="font-mono font-bold text-orange-400">0002090671521</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Beneficiary:</span>
                <span className="font-bold text-white uppercase">HOANG QUOC DUY</span>
              </div>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3.5">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">
              Quick Links
            </h4>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { label: 'Squad Rosters', path: '/players' },
                { label: 'Court Booking', path: '/services/court-booking' },
                { label: 'Academy & Scrimmage', path: '/services/training' },
                { label: 'Fees & Schedules', path: '/information' },
                { label: 'Club Bulletin & News', path: '/news' },
                { label: 'Join DVA Squad', path: '/register' },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="px-3.5 py-2.5 rounded-xl bg-[#121826] hover:bg-gradient-to-r hover:from-red-950/70 hover:to-orange-950/50 border border-slate-800 hover:border-orange-500/50 text-slate-300 hover:text-white flex items-center justify-between text-xs font-semibold group transition-all shadow-sm cursor-pointer"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3: Facility Location & Contact */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">
              Facility Location
            </h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>155 Truong Chinh, Thanh Xuan, Hanoi, Vietnam</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-red-500 shrink-0" />
                <span className="font-mono text-white">0768 299 329</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-red-500 shrink-0" />
                <span>quocduyhoang42@gmail.com</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 leading-relaxed border-t border-slate-800/80">
              Equipped with 3 tournament-grade Taraflex courts, air-conditioned locker rooms, electronic scoreboards, and spectator stands.
            </div>
          </div>

          {/* Col 4: Interactive Arena Map (aligned right on same row) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>Arena Location Map</span>
              </h4>
              <a
                href="https://maps.google.com/?q=155+Truong+Chinh+Thanh+Xuan+Hanoi"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-orange-400 hover:underline flex items-center gap-1"
              >
                <span>Directions</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Embedded interactive map container */}
            <div className="w-full h-52 rounded-2xl overflow-hidden border border-slate-800 bg-[#121826] relative shadow-inner">
              <iframe
                title="DVA Sports Arena Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.819207869634!2d105.82885917609176!3d20.99988228876807!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ac8466b0a7b5%3A0x6a053c8c1e21b0!2zMTU1IFRyxrDhu51uZyBDaGluaCwgS2jGsMahbmcgTWFpLCBUaGFuaCBYdcOibiBZw6puLCBIw6AgTuG7mWksIFZp4buHdCBOYW0!5e0!3m2!1sen!2s!4v1718000000000!5m2!1sen!2s"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'grayscale(0.2) contrast(1.1) invert(0.9) hue-rotate(180deg)' }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="text-[10px] text-slate-500 text-center">
              155 Truong Chinh, Thanh Xuan, Hanoi, Vietnam
            </div>
          </div>

        </div>

        <div className="mt-14 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} DVA Volleyball Club. All Rights Reserved.
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>FIVB Competition Standards</span>
            <span>·</span>
            <span>Taraflex Pro Elite</span>
            <span>·</span>
            <span>Mikasa V200W</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
