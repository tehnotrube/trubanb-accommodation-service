import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { BlockResponseDto } from './block.response.dto';
import { RuleResponseDto } from './rule.response.dto';

export class AccommodationResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Cozy Apartment Belgrade' })
  @Expose()
  name: string;

  @ApiProperty({ example: 'Belgrade, Serbia' })
  @Expose()
  location: string;

  @ApiProperty({ type: [String], example: ['WiFi', 'Kitchen'] })
  @Expose()
  amenities: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['https://cdn.../photo1.jpg'],
  })
  @Expose()
  photoUrls?: string[];

  @ApiProperty({ example: 2 })
  @Expose()
  minGuests: number;

  @ApiProperty({ example: 6 })
  @Expose()
  maxGuests: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @Expose()
  hostId: string;

  @ApiProperty({ example: false })
  @Expose()
  autoApprove: boolean;

  @ApiProperty({ example: 89.99, type: 'number', format: 'decimal' })
  @Expose()
  basePrice: number;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @ApiProperty()
  @Expose()
  isPerUnit: boolean;

  @ApiProperty({ type: [BlockResponseDto] })
  @Expose()
  @Type(() => BlockResponseDto)
  blockedPeriods: BlockResponseDto[];

  @ApiProperty({ type: [RuleResponseDto] })
  @Expose()
  @Type(() => RuleResponseDto)
  accommodationRules: RuleResponseDto[];

  @ApiProperty()
  @Expose()
  available?: boolean;

  @ApiProperty()
  @Expose()
  totalPriceForStay?: number;

  @ApiProperty()
  @Expose()
  pricePerNight?: number;

  @ApiProperty()
  @Expose()
  appliedRulesCount?: number;
}
