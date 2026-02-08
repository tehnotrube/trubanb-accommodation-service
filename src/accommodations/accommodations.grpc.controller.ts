import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Accommodation } from './entities/accommodation.entity';
import { AccommodationsService } from './accommodations.service';
import { parse, isValid } from 'date-fns';

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

export interface ValidateAndCalculatePriceRequest {
  accommodationId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
}

export interface ValidateAndCalculatePriceResponse {
  success: boolean;
  message: string;
  accommodationExists: boolean;
  datesValid: boolean;
  guestsValid: boolean;
  nights: number;
  totalPrice: number;
  pricePerNight: number;
  rulesApplied: number;
  hostId: string;
  autoApprove: boolean;
  isPerUnit: boolean;
}

@Controller()
export class AccommodationsGrpcController {
  constructor(
    @InjectRepository(Accommodation)
    private readonly accommodationRepository: Repository<Accommodation>,
    private readonly accommodationsService: AccommodationsService,
  ) {}

  @GrpcMethod('AccommodationService', 'GetAccommodationInfo')
  async getAccommodationInfo(
    data: GetAccommodationInfoRequest,
  ): Promise<GetAccommodationInfoResponse> {
    const accommodation = await this.accommodationRepository.findOneBy({
      id: data.accommodationId,
    });

    console.log(`[GetAccommodationInfo] accId=${data.accommodationId}, found=${!!accommodation}, hostId=${accommodation?.hostId}`);

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

  @GrpcMethod('AccommodationService', 'ValidateAndCalculatePrice')
  async validateAndCalculatePrice(
    data: ValidateAndCalculatePriceRequest,
  ): Promise<ValidateAndCalculatePriceResponse> {
    const resp: ValidateAndCalculatePriceResponse = {
      success: false,
      message: 'Unknown error',
      accommodationExists: false,
      datesValid: false,
      guestsValid: false,
      nights: 0,
      totalPrice: 0,
      pricePerNight: 0,
      rulesApplied: 0,
      hostId: '',
      autoApprove: false,
      isPerUnit: false,
    };

    const acc = await this.accommodationRepository.findOne({
      where: { id: data.accommodationId },
      relations: ['accommodationRules'],
    });

    if (!acc) {
      resp.message = 'Accommodation not found';
      return resp;
    }

    resp.accommodationExists = true;
    resp.hostId = acc.hostId;
    resp.autoApprove = acc.autoApprove ?? false;
    resp.isPerUnit = acc.isPerUnit ?? false;

    let checkIn: Date, checkOut: Date;
    try {
      checkIn = parse(data.checkIn, 'yyyy-MM-dd', new Date());
      checkOut = parse(data.checkOut, 'yyyy-MM-dd', new Date());

      if (!isValid(checkIn) || !isValid(checkOut)) {
        throw new Error();
      }
    } catch {
      resp.message = 'Invalid date format – use YYYY-MM-DD';
      return resp;
    }

    if (checkOut <= checkIn) {
      resp.message = 'checkOut must be after checkIn';
      return resp;
    }

    resp.datesValid = true;
    resp.nights = this.accommodationsService.calculateNights(
      data.checkIn,
      data.checkOut,
    );

    if (data.guestCount < acc.minGuests) {
      resp.message = `Minimum guests: ${acc.minGuests}`;
      return resp;
    }
    if (data.guestCount > acc.maxGuests) {
      resp.message = `Maximum guests: ${acc.maxGuests}`;
      return resp;
    }

    resp.guestsValid = true;

    const { total, rulesApplied } =
      this.accommodationsService.calculatePriceForPeriod(
        acc,
        checkIn,
        resp.nights,
        data.guestCount,
      );

    resp.totalPrice = Math.round(total * 100) / 100;
    resp.pricePerNight =
      resp.nights > 0
        ? Math.round((resp.totalPrice / resp.nights) * 100) / 100
        : 0;
    resp.rulesApplied = rulesApplied;

    resp.success = true;
    resp.message =
      rulesApplied > 0 ? 'Dynamic rules applied' : 'Base price used';

    return resp;
  }
}
