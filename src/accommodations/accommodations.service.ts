import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Accommodation } from './entities/accommodation.entity';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AccommodationsService {
  constructor(
    @InjectRepository(Accommodation)
    private readonly accommodationRepository: Repository<Accommodation>,
    private readonly storageService: StorageService,
  ) {}

  private withPhotoUrls(accommodation: Accommodation): Accommodation {
    accommodation.photoUrls = this.storageService.getPublicUrls(
      accommodation.photoKeys,
    );
    return accommodation;
  }

  async create(createAccommodationDto: CreateAccommodationDto): Promise<Accommodation> {
    const accommodation = this.accommodationRepository.create({
      ...createAccommodationDto,
      photoKeys: [],
    });
    const saved = await this.accommodationRepository.save(accommodation);
    return this.withPhotoUrls(saved);
  }

  async findAll(paginationDto: PaginationDto) {
    const page = Number(paginationDto.page) || 1;
    const pageSize = Number(paginationDto.pageSize) || 20;

    const skip = (page - 1) * pageSize;

    const [data, total] = await this.accommodationRepository.findAndCount({
      skip,
      take: pageSize,
    });

    return {
      data: data.map((a) => this.withPhotoUrls(a)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<Accommodation> {
    const accommodation = await this.accommodationRepository.findOne({
      where: { id },
    });

    if (!accommodation) {
      throw new NotFoundException(`Accommodation with ID ${id} not found`);
    }

    return this.withPhotoUrls(accommodation);
  }

  async update(
    id: string,
    updateAccommodationDto: UpdateAccommodationDto,
  ): Promise<Accommodation> {
    const accommodation = await this.findOneRaw(id);
    Object.assign(accommodation, updateAccommodationDto);
    const saved = await this.accommodationRepository.save(accommodation);
    return this.withPhotoUrls(saved);
  }

  async remove(id: string): Promise<void> {
    const accommodation = await this.findOneRaw(id);

    if (accommodation.photoKeys.length > 0) {
      await this.storageService.deleteFiles(accommodation.photoKeys);
    }

    await this.accommodationRepository.remove(accommodation);
  }

  async uploadPhotos(
    id: string,
    files: Express.Multer.File[],
  ): Promise<Accommodation> {
    const accommodation = await this.findOneRaw(id);

    const uploadedKeys = await this.storageService.uploadFiles(files, id);
    accommodation.photoKeys = [...accommodation.photoKeys, ...uploadedKeys];

    const saved = await this.accommodationRepository.save(accommodation);
    return this.withPhotoUrls(saved);
  }

  async deletePhoto(id: string, photoKey: string): Promise<Accommodation> {
    const accommodation = await this.findOneRaw(id);

    const photoIndex = accommodation.photoKeys.indexOf(photoKey);
    if (photoIndex === -1) {
      throw new NotFoundException(`Photo not found in accommodation`);
    }

    await this.storageService.deleteFile(photoKey);
    accommodation.photoKeys.splice(photoIndex, 1);

    const saved = await this.accommodationRepository.save(accommodation);
    return this.withPhotoUrls(saved);
  }

  private async findOneRaw(id: string): Promise<Accommodation> {
    const accommodation = await this.accommodationRepository.findOne({
      where: { id },
    });

    if (!accommodation) {
      throw new NotFoundException(`Accommodation with ID ${id} not found`);
    }

    return accommodation;
  }
}
