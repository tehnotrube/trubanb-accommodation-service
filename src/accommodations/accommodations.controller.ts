import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Delete,
  Query,
  Body,
  UseInterceptors,
  UploadedFiles,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AccommodationsService } from './accommodations.service';
import { GetAccommodationsDto } from './dto/get-accommodations.dto';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';
import { AccommodationResponseDto } from './dto/accommodation.response.dto';
import { PaginatedResponse } from '../common/types/PaginatedResponse';
import { ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';
import { ImageFileValidator } from './validators/image-file.validator';
import { RolesGuard, UserRole } from '../auth/guards/roles.guard';
import { KongJwtGuard } from '../auth/guards/kong-jwt.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('accommodations')
export class AccommodationsController {
  constructor(private readonly accommodationsService: AccommodationsService) {}

  @Post()
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async create(
    @Body() createAccommodationDto: CreateAccommodationDto,
  ): Promise<AccommodationResponseDto> {
    const accommodation = await this.accommodationsService.create(
      createAccommodationDto,
    );
    return accommodation;
  }

  @Get()
  async findAll(
    @Query() query: GetAccommodationsDto,
  ): Promise<PaginatedResponse<AccommodationResponseDto>> {
    return this.accommodationsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AccommodationResponseDto> {
    const accommodation = await this.accommodationsService.findOne(id);
    return accommodation;
  }

  @Put(':id')
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateAccommodationDto: UpdateAccommodationDto,
  ): Promise<AccommodationResponseDto> {
    const updated = await this.accommodationsService.update(
      id,
      updateAccommodationDto,
    );
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<void> {
    await this.accommodationsService.remove(id);
  }

  @Post(':id/photos')
  @HttpCode(HttpStatus.OK)
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('photos', 10))
  async uploadPhotos(
    @Param('id') id: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new ImageFileValidator({
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
          }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ): Promise<AccommodationResponseDto> {
    const updated = await this.accommodationsService.uploadPhotos(id, files);
    return updated;
  }
}
