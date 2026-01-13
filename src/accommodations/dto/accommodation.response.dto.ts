import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

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

  @ApiProperty({
    type: [String],
    example: ['WiFi', 'Kitchen', 'Air Conditioning'],
  })
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
}
