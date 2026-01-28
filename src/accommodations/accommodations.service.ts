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
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponse } from '../common/types/PaginatedResponse';
import { StorageService } from '../storage/storage.service';

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
    hostEmail: string,
  ): void {
    if (accommodation.hostId !== hostEmail) {
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

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<AccommodationResponseDto>> {
    const page = Number(paginationDto.page) || 1;
    const pageSize = Number(paginationDto.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const [entities, total] = await this.accommodationRepository.findAndCount({
      skip,
      take: pageSize,
    });

    const dtos = entities.map((entity) => this.toResponseDto(entity));

    return { data: dtos, total, page, pageSize };
  }

  async findOne(id: string): Promise<AccommodationResponseDto> {
    const entity = await this.findOneEntityOrFail(id);
    return this.toResponseDto(entity);
  }

  async update(
    id: string,
    updateAccommodationDto: UpdateAccommodationDto,
    hostEmail: string, // ← added for ownership check
  ): Promise<AccommodationResponseDto> {
    const accommodation = await this.findOneEntityOrFail(id);
    this.checkHostOwnership(accommodation, hostEmail);

    Object.assign(accommodation, updateAccommodationDto);
    const saved = await this.accommodationRepository.save(accommodation);
    return this.toResponseDto(saved);
  }

  async remove(id: string, hostEmail: string): Promise<void> {
    const accommodation = await this.findOneEntityOrFail(id);
    this.checkHostOwnership(accommodation, hostEmail);

    if (accommodation.photoKeys.length > 0) {
      await this.storageService.deleteFiles(accommodation.photoKeys);
    }
    await this.accommodationRepository.remove(accommodation);
  }

  async uploadPhotos(
    id: string,
    files: Express.Multer.File[],
    hostEmail: string,
  ): Promise<AccommodationResponseDto> {
    const accommodation = await this.findOneEntityOrFail(id);
    this.checkHostOwnership(accommodation, hostEmail);

    const uploadedKeys = await this.storageService.uploadFiles(files, id);
    accommodation.photoKeys.push(...uploadedKeys);
    const saved = await this.accommodationRepository.save(accommodation);
    return this.toResponseDto(saved);
  }
}
