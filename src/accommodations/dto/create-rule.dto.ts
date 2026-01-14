export class CreateRuleDto {
  startDate: Date;
  endDate: Date;
  overridePrice?: number;
  multiplier?: number = 1.0;
  periodType?: 'SEASONAL' | 'WEEKEND' | 'HOLIDAY' | 'CUSTOM';
  minStayDays?: number;
  maxStayDays?: number;
}
