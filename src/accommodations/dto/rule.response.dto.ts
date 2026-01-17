import { Type } from 'class-transformer';

export class RuleResponseDto {
  id: string;
  @Type(() => Date)
  startDate: Date;
  @Type(() => Date)
  endDate: Date;
  overridePrice?: number;
  multiplier: number;
  periodType?: string;
  minStayDays?: number;
  maxStayDays?: number;
}
