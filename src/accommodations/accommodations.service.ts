import { Injectable } from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Accommodation } from './entities/accommodation.entity';

@Injectable()
export class AccommodationsService {
  constructor(
    @InjectRepository(Accommodation)
    private readonly accommodationRepository: Repository<Accommodation>,
  ) {}

  async findAll(paginationDto: PaginationDto) {
    const page = Number(paginationDto.page) || 1;
    const pageSize = Number(paginationDto.pageSize) || 20;

    const skip = (page - 1) * pageSize;

    const [data, total] = await this.accommodationRepository.findAndCount({
      skip,
      take: pageSize,
    });

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} accommodation`;
  }

  remove(id: number) {
    return `This action removes a #${id} accommodation`;
  }
}
