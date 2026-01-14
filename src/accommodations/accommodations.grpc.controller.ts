import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Accommodation } from './entities/accommodation.entity';

interface GetAccommodationInfoRequest {
  accommodationId: string;
}

interface GetAccommodationInfoResponse {
  exists: boolean;
  accommodationId: string;
  basePrice: number;
  autoApprove: boolean;
  hostId: string;
  minGuests: number;
  maxGuests: number;
  isPerUnit: boolean;
}

@Controller()
export class AccommodationsGrpcController {
  constructor(
    @InjectRepository(Accommodation)
    private readonly accommodationRepository: Repository<Accommodation>,
  ) {}

  @GrpcMethod('AccommodationService', 'GetAccommodationInfo')
  async getAccommodationInfo(
    data: GetAccommodationInfoRequest,
  ): Promise<GetAccommodationInfoResponse> {
    const accommodation = await this.accommodationRepository.findOneBy({
      id: data.accommodationId,
    });

    if (!accommodation) {
      return {
        exists: false,
        accommodationId: data.accommodationId,
        basePrice: 0,
        autoApprove: false,
        hostId: '',
        minGuests: 0,
        maxGuests: 0,
        isPerUnit: false,
      };
    }

    return {
      exists: true,
      accommodationId: accommodation.id,
      basePrice: accommodation.basePrice,
      autoApprove: accommodation.autoApprove,
      hostId: accommodation.hostId,
      minGuests: accommodation.minGuests,
      maxGuests: accommodation.maxGuests,
      isPerUnit: accommodation.isPerUnit,
    };
  }
}
