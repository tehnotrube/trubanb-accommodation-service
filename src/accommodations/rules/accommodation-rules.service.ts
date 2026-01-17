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
import { AccommodationRule } from '../entities/accommodation-rule.entity';
import { Accommodation } from '../entities/accommodation.entity';
import { BlockedPeriod } from '../entities/blocked-period.entity';
import { CreateRuleDto } from '../dto/create-rule.dto';
import { UpdateRuleDto } from '../dto/update-rule.dto';
import { RuleResponseDto } from '../dto/rule.response.dto';

@Injectable()
export class AccommodationRulesService {
  constructor(
    @InjectRepository(AccommodationRule)
    private readonly ruleRepository: Repository<AccommodationRule>,

    @InjectRepository(Accommodation)
    private readonly accommodationRepository: Repository<Accommodation>,

    @InjectRepository(BlockedPeriod)
    private readonly blockedPeriodRepository: Repository<BlockedPeriod>,
  ) {}

  private async findAccommodationOrFail(id: string): Promise<Accommodation> {
    const accommodation = await this.accommodationRepository.findOneBy({ id });
    if (!accommodation) {
      throw new NotFoundException(`Accommodation with ID ${id} not found`);
    }
    return accommodation;
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

  async createRule(
    accommodationId: string,
    dto: CreateRuleDto,
    hostEmail: string,
  ): Promise<RuleResponseDto> {
    if (dto.startDate >= dto.endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const accommodation = await this.findAccommodationOrFail(accommodationId);
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
      accommodation: { id: accommodationId },
      accommodationId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      overridePrice: dto.overridePrice,
      multiplier: dto.multiplier ?? 1.0,
      periodType: dto.periodType,
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

    const accommodation = await this.findAccommodationOrFail(accommodationId);
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

    const accommodation = await this.findAccommodationOrFail(accommodationId);
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
}
