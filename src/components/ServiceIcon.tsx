import React from 'react';
import {
  Activity,
  Droplet,
  Disc,
  Cog,
  Zap,
  Wind,
  Sliders,
  Flame,
  Thermometer,
  Sparkles,
  Fuel,
  Volume2,
  Sun,
  Palette,
  ShieldCheck,
  Wrench,
  Lightbulb,
  Brush,
  CircleDot,
  Gauge,
  Eye,
  Rocket,
  Layers,
  Repeat,
  Gem,
} from 'lucide-react';
import type { ServiceKind } from '../services/serviceCatalog';

interface ServiceIconProps {
  kind?: ServiceKind | string;
  id?: string;
  className?: string;
  iconClassName?: string;
  size?: number;
}

export function getServiceLucideIcon(kind?: string, id?: string, iconClassName = 'w-4 h-4 text-orange-400') {
  const k = (kind || id || '').toLowerCase();

  if (k.includes('diagnostic') || k.includes('scan') || k.includes('check_engine')) {
    return <Activity className={iconClassName} />;
  }
  if (k.includes('oil_change') || k.includes('oil') || k.includes('fluid')) {
    return <Droplet className={iconClassName} />;
  }
  if (k.includes('brake') || k.includes('rotor') || k.includes('pad')) {
    return <Disc className={iconClassName} />;
  }
  if (k.includes('transmission')) {
    return <Cog className={iconClassName} />;
  }
  if (k.includes('differential')) {
    return <Layers className={iconClassName} />;
  }
  if (k.includes('battery') || k.includes('starter') || k.includes('alternator') || k.includes('electrical')) {
    return <Zap className={iconClassName} />;
  }
  if (k.includes('ac_service') || k.includes('climate') || k.includes('freon')) {
    return <Wind className={iconClassName} />;
  }
  if (k.includes('suspension') || k.includes('lift') || k.includes('strut') || k.includes('shock')) {
    return <Sliders className={iconClassName} />;
  }
  if (k.includes('exhaust') || k.includes('muffler') || k.includes('header')) {
    return <Flame className={iconClassName} />;
  }
  if (k.includes('cooling') || k.includes('radiator') || k.includes('water_pump')) {
    return <Thermometer className={iconClassName} />;
  }
  if (k.includes('belt') || k.includes('hose')) {
    return <Repeat className={iconClassName} />;
  }
  if (k.includes('ignition') || k.includes('spark')) {
    return <Sparkles className={iconClassName} />;
  }
  if (k.includes('fuel')) {
    return <Fuel className={iconClassName} />;
  }
  if (k.includes('audio') || k.includes('speaker') || k.includes('subwoofer')) {
    return <Volume2 className={iconClassName} />;
  }
  if (k.includes('tint')) {
    return <Sun className={iconClassName} />;
  }
  if (k.includes('wrap')) {
    return <Palette className={iconClassName} />;
  }
  if (k.includes('ppf') || k.includes('protection')) {
    return <ShieldCheck className={iconClassName} />;
  }
  if (k.includes('body')) {
    return <Wrench className={iconClassName} />;
  }
  if (k.includes('lighting') || k.includes('light')) {
    return <Lightbulb className={iconClassName} />;
  }
  if (k.includes('color') || k.includes('interior_color')) {
    return <Brush className={iconClassName} />;
  }
  if (k.includes('detail') || k.includes('clean')) {
    return <Sparkles className={iconClassName} />;
  }
  if (k.includes('ceramic')) {
    return <Gem className={iconClassName} />;
  }
  if (k.includes('paint') || k.includes('correction')) {
    return <Sparkles className={iconClassName} />;
  }
  if (k.includes('headlight')) {
    return <Lightbulb className={iconClassName} />;
  }
  if (k.includes('tire') || k.includes('wheel')) {
    return <CircleDot className={iconClassName} />;
  }
  if (k.includes('glass') || k.includes('windshield')) {
    return <Eye className={iconClassName} />;
  }
  if (k.includes('tune') || k.includes('ecu') || k.includes('dyno')) {
    return <Gauge className={iconClassName} />;
  }
  if (k.includes('upgrade') || k.includes('intake') || k.includes('turbo') || k.includes('performance')) {
    return <Rocket className={iconClassName} />;
  }
  if (k.includes('accessori')) {
    return <Sliders className={iconClassName} />;
  }

  return <Wrench className={iconClassName} />;
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({
  kind,
  id,
  className = 'w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm',
  iconClassName = 'w-4 h-4',
}) => {
  return (
    <span className={className}>
      {getServiceLucideIcon(kind, id, iconClassName)}
    </span>
  );
};
