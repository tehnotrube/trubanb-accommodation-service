import { Expose } from 'class-transformer';

export class BlockResponseDto {
  @Expose()
  id: string;

  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;

  @Expose()
  reason: 'RESERVATION' | 'MANUAL';
}
