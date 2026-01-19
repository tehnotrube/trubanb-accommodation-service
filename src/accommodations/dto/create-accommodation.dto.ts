import {
  IsString,
  IsArray,
  IsInt,
  IsBoolean,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateAccommodationDto {
  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsInt()
  @Min(1)
  minGuests: number;

  @IsInt()
  @Min(1)
  maxGuests: number;

  @IsString()
  hostId: string;

  @IsBoolean()
  @IsOptional()
  autoApprove?: boolean;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsBoolean()
  isPerUnit?: boolean;
}
