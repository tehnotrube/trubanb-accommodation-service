import { Accommodation } from '../../../src/accommodations/entities/accommodation.entity';

export const accommodationsFixture: Partial<Accommodation>[] = [
  {
    name: 'Test Hotel',
    location: 'Test City',
    amenities: ['wifi', 'pool'],
    photoKeys: [],
    minGuests: 1,
    maxGuests: 4,
    hostId: 'host@test.com',
    autoApprove: true,
    basePrice: 100.0,
    isPerUnit: true,
    accommodationRules: undefined,
    blockedPeriods: undefined,
  },
  {
    name: 'Beach House',
    location: 'Coastal Town',
    amenities: ['wifi', 'parking', 'kitchen'],
    photoKeys: [],
    minGuests: 2,
    maxGuests: 6,
    hostId: 'host@test.com',
    autoApprove: false,
    basePrice: 150.0,
    isPerUnit: true,
    accommodationRules: undefined,
    blockedPeriods: undefined,
  },
];
