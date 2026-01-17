import { Type } from 'class-transformer';

export class BlockResponseDto {
  id: string;
  @Type(() => Date)
  startDate: Date;
  @Type(() => Date)
  endDate: Date;
  reason: 'RESERVATION' | 'MANUAL';
  notes?: string;
}
