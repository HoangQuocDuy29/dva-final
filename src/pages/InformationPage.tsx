import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  CreditCard, 
  Award, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Footprints,
  Users
} from 'lucide-react';
import { ContactBanner } from '../components/common/ContactBanner';

export const InformationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-950/60 border border-red-800 px-3 py-1 rounded-full">
            Transparent Pricing & Standards
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-heading mt-3">
            Club Fee Structures, Weekly Schedule & Guidelines
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Official rate cards for court reservations, membership programs, weekly training schedules, and Taraflex shoe etiquette rules.
          </p>
        </div>

        {/* SECTION 1: TRANSPARENT FEE STRUCTURE */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-black text-white font-heading">
              1. Published Rate Cards & Service Fees
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Court Rental */}
            <div className="bg-[#161F30] rounded-3xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
              <div>
                <span className="px-3 py-1 bg-red-950 border border-red-800 text-red-400 text-xs font-bold rounded-lg uppercase">
                  Court Rental
                </span>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading font-black text-3xl text-white">500,000</span>
                    <span className="text-xs font-bold text-slate-400">VND / Hour</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">The Cong & My Dinh: 500k/h · BTL Thong Tin: 550k/h</p>
                </div>

                <div className="mt-6 space-y-2.5 border-t border-slate-800 pt-4 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>FIVB tournament-certified 7.5mm Taraflex flooring across 3 arenas.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="font-bold text-orange-400">Includes 1 Free Official Mikasa V200W Match Ball.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Scoreboard, referee whistle, air-conditioned locker rooms & hot showers.</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Link
                  to="/services/court-booking"
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-500 text-center block transition-colors shadow cursor-pointer"
                >
                  Book Court Online
                </Link>
              </div>
            </div>

            {/* Card 2: Club Entry Pass (Replaces DVA Quad Membership as requested) */}
            <div className="bg-gradient-to-b from-[#161F30] to-[#1F1728] rounded-3xl border-2 border-orange-500/60 p-6 shadow-2xl flex flex-col justify-between relative">
              <div className="absolute -top-3 right-6 bg-orange-600 text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full shadow">
                Standard Access
              </div>

              <div>
                <span className="px-3 py-1 bg-orange-950 border border-orange-800 text-orange-300 text-xs font-bold rounded-lg uppercase">
                  Club Entry / Drop-in Pass
                </span>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading font-black text-3xl text-orange-400">100,000</span>
                    <span className="text-xs font-bold text-slate-400">VND / Person</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Per Session Drop-in Pass & Booking Rights</p>
                </div>

                <div className="mt-6 space-y-2.5 border-t border-slate-800 pt-4 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="font-bold text-white">Full right to reserve & select future play dates in advance.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Direct access to official DVA scrimmage matchmaking lobbies.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Free use of court amenities, ball carts, and recovery gear.</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Link
                  to="/services/court-booking"
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-center block shadow-lg cursor-pointer"
                >
                  Reserve Your Session
                </Link>
              </div>
            </div>

            {/* Card 3: Monthly Basic Scrimmage Pass (Replaces Technical Academy Course) */}
            <div className="bg-[#161F30] rounded-3xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
              <div>
                <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg uppercase">
                  Monthly Basic Scrimmage Pass
                </span>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading font-black text-3xl text-white">840,000</span>
                    <span className="text-xs font-bold text-slate-400">VND / Month</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Guaranteed Spot Across All Monthly Scrimmages</p>
                </div>

                <div className="mt-6 space-y-2.5 border-t border-slate-800 pt-4 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="font-bold text-white">Guaranteed reserved spot in EVERY scrimmage session throughout the month.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Fixed specialist position allocation (OH, OP, S, MB, L).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Full match HD video recordings and coach feedback included.</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Link
                  to="/services/training"
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-slate-800 hover:bg-slate-700 text-center block transition-colors cursor-pointer"
                >
                  Enroll in Scrimmage Packages
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 2: WEEKLY ARENA SCHEDULE */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-black text-white font-heading">
              2. Weekly Arena Schedule & Squad Training Matrix
            </h2>
          </div>

          <div className="border border-slate-800 rounded-3xl overflow-hidden bg-[#161F30] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#0E1524] text-white font-bold border-b border-slate-800">
                    <th className="py-4 px-5">Session / Day</th>
                    <th className="py-4 px-5">Scheduled Squad / Activity</th>
                    <th className="py-4 px-5">Target Level</th>
                    <th className="py-4 px-5 text-right">Court Allocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                  
                  {/* Row 1: Mon - Wed - Sat Evening (Senior) */}
                  <tr className="hover:bg-slate-800/40 bg-red-950/15">
                    <td className="py-4 px-5 font-mono font-bold text-orange-400">
                      Mon · Wed · Sat (19:00 – 21:30)
                    </td>
                    <td className="py-4 px-5 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                      <span>Official DVA Senior Squad Training & Scrimmage</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                        SENIOR (Experienced Players &gt; 3 Years)
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-slate-400">
                      BTL Thong Tin Arena · Courts 1 & 2
                    </td>
                  </tr>

                  {/* Row 2: Friday Evening (Junior) */}
                  <tr className="hover:bg-slate-800/40 bg-blue-950/15">
                    <td className="py-4 px-5 font-mono font-bold text-cyan-400">
                      Friday Evening (19:00 – 21:30)
                    </td>
                    <td className="py-4 px-5 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <span>DVA Junior Squad Tactical & 5-1 Formation Matchplay</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                        JUNIOR (Intermediate Recreational Players)
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-slate-400">
                      The Cong Arena · Court 1
                    </td>
                  </tr>

                  {/* Row 3: Sunday Afternoon (Junior & Youth) */}
                  <tr className="hover:bg-slate-800/40 bg-emerald-950/15">
                    <td className="py-4 px-5 font-mono font-bold text-emerald-400">
                      Sunday Afternoon (14:00 – 16:30)
                    </td>
                    <td className="py-4 px-5 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>DVA Junior & Youth (Fundamentals)</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        JUNIOR & YOUTH
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-slate-400">
                      My Dinh Arena · Central Court
                    </td>
                  </tr>

                  {/* Row 4: Daily Daytime Open Hours */}
                  <tr className="hover:bg-slate-800/40 text-slate-400">
                    <td className="py-3.5 px-5 font-mono text-slate-400">
                      Daily (06:00 – 18:30)
                    </td>
                    <td className="py-3.5 px-5">
                      Open Court Public Reservations & 1-on-1 Private Coaching
                    </td>
                    <td className="py-3.5 px-5">
                      Open to All Members, Teams & Public Visitors
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-slate-500">
                      All 3 Arenas (Real-Time Availability)
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 3: JOINING CRITERIA */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-black text-white font-heading">
              3. Squad Tryout Selection Criteria
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-[#161F30] rounded-3xl border border-slate-800 p-6 shadow-xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-black text-lg text-white">Senior Team</h3>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-900 text-red-200 uppercase">Division 1</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-800 pt-3">
                <li>• <strong>Height:</strong> Men ≥ 185cm, Women ≥ 170cm</li>
                <li>• <strong>Spike Reach:</strong> Men ≥ 335cm, Women ≥ 295cm</li>
                <li>• <strong>Block Reach:</strong> Men ≥ 320cm, Women ≥ 285cm</li>
                <li>• <strong>Tactics:</strong> Fluid mastery of 5-1 rotational mechanics.</li>
              </ul>
            </div>

            <div className="bg-[#161F30] rounded-3xl border border-slate-800 p-6 shadow-xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-black text-lg text-white">Junior Squad</h3>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-orange-900 text-orange-200 uppercase">U19 - U21</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-800 pt-3">
                <li>• <strong>Height:</strong> Men ≥ 180cm, Women ≥ 165cm</li>
                <li>• <strong>Spike Reach:</strong> Men ≥ 315cm, Women ≥ 280cm</li>
                <li>• <strong>Conditioning:</strong> Agility, rapid deceleration, high coachability.</li>
                <li>• <strong>Tactics:</strong> Basic comprehension of 4-2 or 5-1 rotations.</li>
              </ul>
            </div>

            <div className="bg-[#161F30] rounded-3xl border border-slate-800 p-6 shadow-xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-black text-lg text-white">Youth</h3>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-900 text-blue-200 uppercase">Youth</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-800 pt-3">
                <li>• <strong>Age:</strong> Boys & girls ages 9 through 14.</li>
                <li>• <strong>Requirements:</strong> Passion for sport and team spirit.</li>
                <li>• <strong>Entrance Evaluation:</strong> Vertec vertical test & agility obstacle.</li>
                <li>• Beginners welcome; comprehensive training from scratch.</li>
              </ul>
            </div>

          </div>
        </section>

        {/* FAST TRACK HOTLINE & ZALO CONTACT BANNER */}
        <ContactBanner />

        {/* SECTION 4: TARAFLEX SHOE ETIQUETTE */}
        <section className="bg-[#161F30] rounded-3xl border border-slate-800 p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-2">
            <Footprints className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-black text-white font-heading">
              4. Taraflex Court Shoe Etiquette & Facility Standards
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
            <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-2">
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>Non-Marking Gum Rubber Soles Required</span>
              </div>
              <p className="leading-relaxed text-slate-400">
                To safeguard the professional shock-absorbing properties of our 7.5mm Taraflex flooring, all players must wear <strong>indoor-only volleyball shoes with clean non-marking rubber soles</strong> (e.g. Asics, Mizuno, Nike). Street shoes worn outside are strictly forbidden on court.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0E1524] border border-slate-800 space-y-2">
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Official Mikasa V200W Equipment Care</span>
              </div>
              <p className="leading-relaxed text-slate-400">
                Match balls are provided by the club for every session. Players are expected to retrieve and return all balls to the reception counter at session conclusion. Kicking volleyballs with feet is strictly prohibited.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
