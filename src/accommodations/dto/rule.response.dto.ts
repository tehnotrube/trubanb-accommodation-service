import { Expose } from 'class-transformer';

export class RuleResponseDto {
  @Expose()
  id: string;

  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;

  @Expose()
  overridePrice?: number;

  @Expose()
  multiplier: number;

  @Expose()
  periodType?: string;
}
