import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { BlockedPeriod } from '../entities/blocked-period.entity';
import { Accommodation } from '../entities/accommodation.entity';
import { CreateManualBlockDto } from '../dto/create-manual-block.dto';
import { BlockResponseDto } from '../dto/block.response.dto';

@Injectable()
export class BlockedPeriodsService {
  constructor(
    @InjectRepository(BlockedPeriod)
    private readonly blockedPeriodRepository: Repository<BlockedPeriod>,

    @InjectRepository(Accommodation)
    private readonly accommodationRepository: Repository<Accommodation>,
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

  async createManualBlock(
    accommodationId: string,
    dto: CreateManualBlockDto,
    hostEmail: string,
  ): Promise<BlockResponseDto> {
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

    const block = this.blockedPeriodRepository.create({
      accommodation: { id: accommodationId },
      accommodationId,
      ...dto,
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

    const accommodation = await this.findAccommodationOrFail(accommodationId);
    this.checkHostOwnership(accommodation, hostEmail);

    await this.blockedPeriodRepository.remove(block);
  }
}
