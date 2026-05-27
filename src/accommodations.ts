import type { AccommodationId } from './types';

export interface AccommodationConfig {
  label: string;
  color: string; // used for dot fill and chip tint
}

export const ACCOMMODATION_CONFIG: Record<AccommodationId, AccommodationConfig> = {
  iep:          { label: 'IEP',                 color: '#3b82f6' }, // blue
  '504':        { label: '504',                 color: '#8b5cf6' }, // purple
  behavior:     { label: 'Behavior plan',       color: '#f97316' }, // orange
  preferential: { label: 'Preferential seating',color: '#14b8a6' }, // teal
};

export const ACCOMMODATION_ORDER: AccommodationId[] = ['iep', '504', 'behavior', 'preferential'];
