import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Accommodation } from './entities/accommodation.entity';
import { AccommodationResponseDto } from './dto/accommodation.response.dto';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';
import { PaginatedResponse } from '../common/types/PaginatedResponse';
import { StorageService } from '../storage/storage.service';
import { GetAccommodationsDto } from './dto/get-accommodations.dto';

@Injectable()
export class AccommodationsService {
  constructor(
    @InjectRepository(Accommodation)
    private readonly accommodationRepository: Repository<Accommodation>,
    private readonly storageService: StorageService,
  ) {}

  private toResponseDto(entity: Accommodation): AccommodationResponseDto {
    return plainToInstance(
      AccommodationResponseDto,
      {
        ...entity,
        photoUrls: this.storageService.getPublicUrls(entity.photoKeys),
        blockedPeriods: entity.blockedPeriods?.map((b) => ({
          id: b.id,
          startDate: b.startDate,
          endDate: b.endDate,
          reason: b.reason,
        })),
        accommodationRules: entity.accommodationRules?.map((r) => ({
          id: r.id,
          startDate: r.startDate,
          endDate: r.endDate,
          overridePrice: r.overridePrice,
          multiplier: r.multiplier,
          periodType: r.periodType,
        })),
      },
      { excludeExtraneousValues: true },
    );
  }

  private checkHostOwnership(
    accommodation: Accommodation,
    hostId: string,
  ): void {
    if (accommodation.hostId !== hostId) {
      throw new ForbiddenException('You do not own this accommodation');
    }
  }

  private async findOneEntityOrFail(id: string): Promise<Accommodation> {
    const accommodation = await this.accommodationRepository.findOneBy({ id });
    if (!accommodation) {
      throw new NotFoundException(`Accommodation with ID ${id} not found`);
    }
    return accommodation;
  }

  async create(
    createAccommodationDto: CreateAccommodationDto,
    hostId: string,
  ): Promise<AccommodationResponseDto> {
    if (createAccommodationDto.minGuests > createAccommodationDto.maxGuests) {
      throw new BadRequestException(
        'minGuests cannot be greater than maxGuests',
      );
    }

    const accommodation = this.accommodationRepository.create({
      ...createAccommodationDto,
      hostId,
      photoKeys: [],
    });
    const saved = await this.accommodationRepository.save(accommodation);
    return this.toResponseDto(saved);
  }

  public calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  public calculatePriceForPeriod(
    accommodation: Accommodation,
    checkIn: Date,
    nights: number,
    guestCount: number,
  ): { total: number; rulesApplied: number } {
    let total = 0;
    let rulesApplied = 0;

    const base = accommodation.basePrice;
    const rules = accommodation.accommodationRules ?? [];

    for (let i = 0; i < nights; i++) {
      const nightDate = new Date(checkIn);
      nightDate.setDate(nightDate.getDate() + i);

      let nightPrice = base;

      for (const rule of rules) {
        const ruleStart = new Date(rule.startDate);
        const ruleEnd = new Date(rule.endDate);
        if (nightDate >= ruleStart && nightDate <= ruleEnd) {
          if (rule.overridePrice !== null && rule.overridePrice !== undefined) {
            nightPrice = rule.overridePrice;
          }

          nightPrice = nightPrice * (rule.multiplier ?? 1.0);
          rulesApplied++;
          break;
        }
      }

      if (!accommodation.isPerUnit) {
        nightPrice *= guestCount;
      }

      total += nightPrice;
    }

    return {
      total: Math.round(total * 100) / 100,
      rulesApplied,
    };
  }
  async findAll(
    query: GetAccommodationsDto,
  ): Promise<PaginatedResponse<AccommodationResponseDto>> {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const qb = this.accommodationRepository
      .createQueryBuilder('acc')
      .leftJoinAndSelect('acc.blockedPeriods', 'bp')
      .leftJoinAndSelect('acc.accommodationRules', 'ar');

    if (query.location?.trim()) {
      qb.andWhere('LOWER(acc.location) LIKE LOWER(:location)', {
        location: `%${query.location.trim()}%`,
      });
    }

    if (query.guests) {
      qb.andWhere(':guests BETWEEN acc.minGuests AND acc.maxGuests', {
        guests: query.guests,
      });
    }

    let checkInDate: Date | null = null;
    let nights = 0;

    if (query.checkIn && query.checkOut) {
      checkInDate = new Date(query.checkIn);
      const checkOutDate = new Date(query.checkOut);

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        throw new BadRequestException('Invalid date format (use YYYY-MM-DD)');
      }

      if (checkOutDate <= checkInDate) {
        throw new BadRequestException('checkOut must be after checkIn');
      }

      nights = this.calculateNights(query.checkIn, query.checkOut);

      qb.andWhere(
        `NOT EXISTS (
        SELECT 1 FROM blocked_periods bp
        WHERE bp."accommodationId" = acc.id
        AND bp."startDate" < :checkOut
        AND (bp."endDate" > :checkIn OR bp."endDate" IS NULL)
      )`,
        {
          checkIn: checkInDate,
          checkOut: checkOutDate,
        },
      );
    }

    const [entities, total] = await qb
      .skip(skip)
      .take(pageSize)
      .orderBy('acc.createdAt', 'DESC')
      .getManyAndCount();

    const dtos = entities.map((entity) => {
      const dto = this.toResponseDto(entity);

      if (checkInDate && nights > 0) {
        const guestCount = query.guests ?? entity.maxGuests;

        const { total, rulesApplied } = this.calculatePriceForPeriod(
          entity,
          checkInDate,
          nights,
          guestCount,
        );

        dto.totalPriceForStay = total;
        dto.pricePerNight =
          nights > 0 ? Math.round((total / nights) * 100) / 100 : undefined;
        dto.appliedRulesCount = rulesApplied;
      }

      return dto;
    });

    return {
      data: dtos,
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<AccommodationResponseDto> {
    const entity = await this.findOneEntityOrFail(id);
    return this.toResponseDto(entity);
  }

  async update(
    id: string,
    updateAccommodationDto: UpdateAccommodationDto,
    hostId: string, // ← added for ownership check
  ): Promise<AccommodationResponseDto> {
    const accommodation = await this.findOneEntityOrFail(id);
    this.checkHostOwnership(accommodation, hostId);

    Object.assign(accommodation, updateAccommodationDto);
    const saved = await this.accommodationRepository.save(accommodation);
    return this.toResponseDto(saved);
  }

  async remove(id: string, hostId: string): Promise<void> {
    const accommodation = await this.findOneEntityOrFail(id);
    this.checkHostOwnership(accommodation, hostId);

    if (accommodation.photoKeys.length > 0) {
      await this.storageService.deleteFiles(accommodation.photoKeys);
    }
    await this.accommodationRepository.remove(accommodation);
  }

  async uploadPhotos(
    id: string,
    files: Express.Multer.File[],
    hostId: string,
  ): Promise<AccommodationResponseDto> {
    const accommodation = await this.findOneEntityOrFail(id);
    this.checkHostOwnership(accommodation, hostId);

    const uploadedKeys = await this.storageService.uploadFiles(files, id);
    accommodation.photoKeys.push(...uploadedKeys);
    const saved = await this.accommodationRepository.save(accommodation);
    return this.toResponseDto(saved);
  }

  async removeAllByHostId(hostId: string): Promise<number> {
    const accommodations = await this.accommodationRepository.find({
      where: { hostId },
    });

    if (accommodations.length === 0) {
      return 0;
    }

    const photoKeys = accommodations.flatMap((acc) => acc.photoKeys || []);
    if (photoKeys.length > 0) {
      await this.storageService.deleteFiles(photoKeys);
    }

    await this.accommodationRepository.remove(accommodations);
    return accommodations.length;
  }
}
