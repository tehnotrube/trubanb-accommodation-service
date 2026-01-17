export class BlockResponseDto {
  id: string;
  startDate: Date;
  endDate: Date;
  reason: 'RESERVATION' | 'MANUAL';
  notes?: string;
}
