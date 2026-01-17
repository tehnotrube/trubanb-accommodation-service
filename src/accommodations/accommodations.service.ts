import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  FindOptionsWhere,
} from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Accommodation } from './entities/accommodation.entity';
import { AccommodationRule } from './entities/accommodation-rule.entity';
import { BlockedPeriod } from './entities/blocked-period.entity';
import { AccommodationResponseDto } from './dto/accommodation.response.dto';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { StorageService } from '../storage/storage.service';
import { PaginatedResponse } from '../common/types/PaginatedResponse';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { CreateManualBlockDto } from './dto/create-manual-block.dto';
import { RuleResponseDto } from './dto/rule.response.dto';
import { BlockResponseDto } from './dto/block.response.dto';

@Injectable()
export class AccommodationsService {
  constructor(
    @InjectRepository(Accommodation)
    private readonly accommodationRepository: Repository<Accommodation>,
    @InjectRepository(AccommodationRule)
    private readonly ruleRepository: Repository<AccommodationRule>,
    @InjectRepository(BlockedPeriod)
    private readonly blockedPeriodRepository: Repository<BlockedPeriod>,
    private readonly storageService: StorageService,
  ) {}

  private toResponseDto(entity: Accommodation): AccommodationResponseDto {
    return plainToInstance(
      AccommodationResponseDto,
      {
        ...entity,
        photoUrls: this.storageService.getPublicUrls(entity.photoKeys),
      },
      { excludeExtraneousValues: true },
    );
  }

  async create(
    createAccommodationDto: CreateAccommodationDto,
  ): Promise<AccommodationResponseDto> {
    const accommodation = this.accommodationRepository.create({
      ...createAccommodationDto,
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
    const entity = await this.accommodationRepository.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException(`Accommodation with ID ${id} not found`);
    }
    return this.toResponseDto(entity);
  }

  async update(
    id: string,
    updateAccommodationDto: UpdateAccommodationDto,
  ): Promise<AccommodationResponseDto> {
    const accommodation = await this.findOneEntityOrFail(id);
    Object.assign(accommodation, updateAccommodationDto);
    const saved = await this.accommodationRepository.save(accommodation);
    return this.toResponseDto(saved);
  }

  async remove(id: string): Promise<void> {
    const accommodation = await this.findOneEntityOrFail(id);
    if (accommodation.photoKeys.length > 0) {
      await this.storageService.deleteFiles(accommodation.photoKeys);
    }
    await this.accommodationRepository.remove(accommodation);
  }

  async uploadPhotos(
    id: string,
    files: Express.Multer.File[],
  ): Promise<AccommodationResponseDto> {
    const accommodation = await this.findOneEntityOrFail(id);
    const uploadedKeys = await this.storageService.uploadFiles(files, id);
    accommodation.photoKeys.push(...uploadedKeys);
    const saved = await this.accommodationRepository.save(accommodation);
    return this.toResponseDto(saved);
  }

  private async findOneEntityOrFail(id: string): Promise<Accommodation> {
    const accommodation = await this.accommodationRepository.findOneBy({ id });
    if (!accommodation) {
      throw new NotFoundException(`Accommodation with ID ${id} not found`);
    }
    return accommodation;
  }

  async createRule(
    accommodationId: string,
    dto: CreateRuleDto,
    hostEmail: string,
  ): Promise<RuleResponseDto> {
    const accommodation = await this.findOneEntityOrFail(accommodationId);
    this.checkHostOwnership(accommodation, hostEmail);

    await this.checkNoActiveReservations(
      accommodationId,
      dto.startDate,
      dto.endDate,
    );

    await this.checkOverlappingRules(
      accommodationId,
      dto.startDate,
      dto.endDate,
    );

    const rule = this.ruleRepository.create({
      ...dto,
      accommodationId,
      multiplier: dto.multiplier ?? 1.0,
    });

    const saved = await this.ruleRepository.save(rule);
    return plainToInstance(RuleResponseDto, saved);
  }

  async updateRule(
    accommodationId: string,
    ruleId: string,
    dto: UpdateRuleDto,
    hostEmail: string,
  ): Promise<RuleResponseDto> {
    const rule = await this.ruleRepository.findOne({
      where: { id: ruleId, accommodationId },
    });
    if (!rule) {
      throw new NotFoundException(`Rule with ID ${ruleId} not found`);
    }

    const accommodation = await this.findOneEntityOrFail(accommodationId);
    this.checkHostOwnership(accommodation, hostEmail);

    const effectiveStart = dto.startDate ?? rule.startDate;
    const effectiveEnd = dto.endDate ?? rule.endDate;

    await this.checkNoActiveReservations(
      accommodationId,
      effectiveStart,
      effectiveEnd,
    );

    await this.checkOverlappingRules(
      accommodationId,
      effectiveStart,
      effectiveEnd,
      rule.id,
    );

    Object.assign(rule, dto);
    const updated = await this.ruleRepository.save(rule);
    return plainToInstance(RuleResponseDto, updated);
  }

  async deleteRule(
    accommodationId: string,
    ruleId: string,
    hostEmail: string,
  ): Promise<void> {
    const rule = await this.ruleRepository.findOne({
      where: { id: ruleId, accommodationId },
    });
    if (!rule) {
      throw new NotFoundException(`Rule with ID ${ruleId} not found`);
    }

    const accommodation = await this.findOneEntityOrFail(accommodationId);
    this.checkHostOwnership(accommodation, hostEmail);

    await this.checkNoActiveReservations(
      accommodationId,
      rule.startDate,
      rule.endDate,
    );

    await this.ruleRepository.remove(rule);
  }

  async getRules(accommodationId: string): Promise<RuleResponseDto[]> {
    const rules = await this.ruleRepository.find({
      where: { accommodationId },
      order: { startDate: 'ASC' },
    });
    return plainToInstance(RuleResponseDto, rules);
  }

  async createManualBlock(
    accommodationId: string,
    dto: CreateManualBlockDto,
    hostEmail: string,
  ): Promise<BlockResponseDto> {
    const accommodation = await this.findOneEntityOrFail(accommodationId);
    this.checkHostOwnership(accommodation, hostEmail);

    await this.checkNoActiveReservations(
      accommodationId,
      dto.startDate,
      dto.endDate,
    );

    const block = this.blockedPeriodRepository.create({
      ...dto,
      accommodationId,
      reason: 'MANUAL',
    });

    const saved = await this.blockedPeriodRepository.save(block);
    return plainToInstance(BlockResponseDto, saved);
  }

  async deleteManualBlock(
    accommodationId: string,
    blockId: string,
    hostEmail: string,
  ): Promise<void> {
    const block = await this.blockedPeriodRepository.findOne({
      where: { id: blockId, accommodationId, reason: 'MANUAL' },
    });
    if (!block) {
      throw new NotFoundException(
        `Manual block with ID ${blockId} not found or not deletable`,
      );
    }

    const accommodation = await this.findOneEntityOrFail(accommodationId);
    this.checkHostOwnership(accommodation, hostEmail);

    await this.blockedPeriodRepository.remove(block);
  }

  private checkHostOwnership(
    accommodation: Accommodation,
    hostEmail: string,
  ): void {
    if (accommodation.hostId !== hostEmail) {
      throw new ForbiddenException('You do not own this accommodation');
    }
  }

  private async checkNoActiveReservations(
    accommodationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const overlapping = await this.blockedPeriodRepository.count({
      where: {
        accommodationId,
        reason: 'RESERVATION',
        startDate: LessThanOrEqual(endDate),
        endDate: MoreThanOrEqual(startDate),
      },
    });

    if (overlapping > 0) {
      throw new BadRequestException(
        'Cannot modify this period because it contains active reservations',
      );
    }
  }

  private async checkOverlappingRules(
    accommodationId: string,
    startDate: Date,
    endDate: Date,
    excludeRuleId?: string,
  ): Promise<void> {
    const where: FindOptionsWhere<AccommodationRule> = {
      accommodationId,
      startDate: LessThanOrEqual(endDate),
      endDate: MoreThanOrEqual(startDate),
    };

    if (excludeRuleId) {
      where.id = Not(excludeRuleId);
    }

    const overlapping = await this.ruleRepository.count({ where });

    if (overlapping > 0) {
      throw new BadRequestException(
        'A rule already exists for this accommodation in the selected period',
      );
    }
  }
}
