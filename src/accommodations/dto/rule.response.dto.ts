export class RuleResponseDto {
  id: string;
  startDate: Date;
  endDate: Date;
  overridePrice?: number;
  multiplier: number;
  periodType?: string;
  minStayDays?: number;
  maxStayDays?: number;
}
