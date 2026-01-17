import { PeriodType } from '../entities/accommodation-rule.entity';

export class UpdateRuleDto {
  startDate?: Date;
  endDate?: Date;
  overridePrice?: number;
  multiplier?: number;
  periodType?: PeriodType;
  minStayDays?: number;
  maxStayDays?: number;
}
