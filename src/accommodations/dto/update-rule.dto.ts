import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { PeriodType } from '../entities/accommodation-rule.entity';

export class UpdateRuleDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overridePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  multiplier?: number;

  @IsOptional()
  @IsEnum(PeriodType)
  periodType?: PeriodType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minStayDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxStayDays?: number;
}
