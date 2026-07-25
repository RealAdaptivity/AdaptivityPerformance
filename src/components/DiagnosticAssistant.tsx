import React, { useState } from 'react';
import { Stethoscope, AlertTriangle, Wrench, ArrowRight } from 'lucide-react';

interface DiagnosticAssistantProps {
  onSelectRecommendedService: (serviceName: string) => void;
}

interface DiagnosticScenario {
  id: string;
  zone: 'Brakes' | 'Engine' | 'Electrical' | 'Suspension' | 'Steering';
  symptomTitle: string;
  description: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  potentialCauses: string[];
  recommendedFix: string;
  estimatedPriceRange: string;
}

const SYMPTOMS: DiagnosticScenario[] = [
  {
    id: 'symph-1',
    zone: 'Brakes',
    symptomTitle: 'High-Pitched Squeal or Grinding Noise When Stopping',
    description: 'Noise occurs whenever applying pedal pressure, pedal feels spongy or pulsates.',
    urgency: 'High',
    potentialCauses: ['Worn brake pad wear indicator clips', 'Warped or grooved brake rotors', 'Stuck caliper slide pins'],
    recommendedFix: 'Front or Rear Ceramic Pad & Rotor Replacement',
    estimatedPriceRange: '$220 - $260',
  },
  {
    id: 'symph-2',
    zone: 'Electrical',
    symptomTitle: 'Rapid Clicking Sound When Turning Key / Car Won\'t Start',
    description: 'Dash lights flicker, starter motor makes repeated rapid clicking sound, engine doesn\'t turn over.',
    urgency: 'Critical',
    potentialCauses: ['Discharged/Dead 12V Battery', 'Corroded battery cables', 'Failing alternator not charging battery'],
    recommendedFix: 'On-Site Battery Swap & Charging System Diagnostic',
    estimatedPriceRange: '$180 - $230',
  },
  {
    id: 'symph-3',
    zone: 'Engine',
    symptomTitle: 'Check Engine Light ON + Engine Sputtering / Rough Idle',
    description: 'Vehicle shakes while idling at red lights, sluggish acceleration, fuel economy drop.',
    urgency: 'Medium',
    potentialCauses: ['Failing spark plug or ignition coil misfire', 'Dirty mass airflow sensor', 'Vacuum leak or O2 sensor error'],
    recommendedFix: 'Full Computer Diagnostic & Spark Plug / Coil Replacement',
    estimatedPriceRange: '$85 (Diag) / $180 (Tune-up)',
  },
  {
    id: 'symph-4',
    zone: 'Suspension',
    symptomTitle: 'Loud Metallic Clunking Over Bumps / Excessive Body Sway',
    description: 'Vehicle feels floaty on highway, audible knocking sound when going over speed bumps or turning in Justin/Northlake neighborhoods.',
    urgency: 'Medium',
    potentialCauses: ['Worn sway bar links or bushings', 'Leaking strut/shock absorber', 'Loose control arm ball joint'],
    recommendedFix: 'Suspension Inspection & Heavy Duty Strut/Link Replacement',
    estimatedPriceRange: '$290 - $420',
  },
  {
    id: 'symph-5',
    zone: 'Engine',
    symptomTitle: 'Sweet Smell Under Hood + Temperature Gauge Rising',
    description: 'Steam visible from under hood, heater blowing cold air, green/orange fluid leaking under vehicle.',
    urgency: 'Critical',
    potentialCauses: ['Radiator hose crack', 'Failing water pump', 'Thermostat stuck closed'],
    recommendedFix: 'Mobile Coolant System Pressure Test & Hose/Pump Replacement',
    estimatedPriceRange: '$190 - $380',
  },
];

export const DiagnosticAssistant: React.FC<DiagnosticAssistantProps> = ({ onSelectRecommendedService }) => {
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [activeSymptom, setActiveSymptom] = useState<DiagnosticScenario>(SYMPTOMS[0]);

  const filteredSymptoms = selectedZone === 'All' 
    ? SYMPTOMS 
    : SYMPTOMS.filter(s => s.zone === selectedZone);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Critical': return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'High': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'Medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <section id="diagnostics" className="py-20 bg-[#0b0c10] relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">

        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Interactive Diagnostic Assistant</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            What is your vehicle <span className="text-orange-500">experiencing?</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Select a symptom below to see likely causes, repair urgency, and instant recommended solutions from Adaptivity Performance.
          </p>
        </div>

        {/* Zone Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {['All', 'Brakes', 'Engine', 'Electrical', 'Suspension'].map(zone => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedZone === zone
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-[#12141c] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Symptom List */}
          <div className="lg:col-span-6 space-y-3">
            {filteredSymptoms.map(item => {
              const isActive = activeSymptom.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveSymptom(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#161822] border-orange-500 shadow-xl shadow-orange-500/10'
                      : 'bg-[#12141c] border-white/5 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                          {item.zone}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getUrgencyColor(item.urgency)}`}>
                          Urgency: {item.urgency}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white">{item.symptomTitle}</h4>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-1">{item.description}</p>
                    </div>
                    <ArrowRight className={`w-5 h-5 flex-shrink-0 transition-transform ${isActive ? 'text-orange-400 translate-x-1' : 'text-slate-600'}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Symptom Detail & AI Recommendation Card */}
          <div className="lg:col-span-6">
            <div className="bg-gradient-to-b from-[#141722] to-[#0f1118] p-6 rounded-2xl border border-orange-500/30 shadow-2xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-orange-400">Diagnostic Analysis</span>
                  <h3 className="font-heading text-lg font-bold text-white mt-0.5">{activeSymptom.symptomTitle}</h3>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Likely Root Causes</span>
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {activeSymptom.potentialCauses.map((cause, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                        <span>{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#0b0c10] p-4 rounded-xl border border-white/10 space-y-2">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-orange-400" /> Recommended Action Plan
                  </div>
                  <div className="font-bold text-sm text-white">{activeSymptom.recommendedFix}</div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                    <span className="text-slate-400">Est. Repair Range:</span>
                    <span className="font-extrabold text-orange-400 text-base">{activeSymptom.estimatedPriceRange}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectRecommendedService(activeSymptom.recommendedFix)}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center space-x-2"
              >
                <span>Book This Recommended Repair</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
