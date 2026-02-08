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
  Patch,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AccommodationsService } from './accommodations.service';
import { AccommodationRulesService } from './rules/accommodation-rules.service';

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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { RuleResponseDto } from './dto/rule.response.dto';

@Controller('/api/accommodations')
export class AccommodationsController {
  constructor(
    private readonly accommodationsService: AccommodationsService,
    private readonly rulesService: AccommodationRulesService,
  ) {}

  @Post()
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async create(
    @Body() createAccommodationDto: CreateAccommodationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AccommodationResponseDto> {
    return this.accommodationsService.create(
      createAccommodationDto,
      user.id,
    );
  }

  @Get()
  async findAll(
    @Query() query: GetAccommodationsDto,
  ): Promise<PaginatedResponse<AccommodationResponseDto>> {
    return this.accommodationsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AccommodationResponseDto> {
    return this.accommodationsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateAccommodationDto: UpdateAccommodationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AccommodationResponseDto> {
    return this.accommodationsService.update(
      id,
      updateAccommodationDto,
      user.id,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.accommodationsService.remove(id, user.id);
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AccommodationResponseDto> {
    return this.accommodationsService.uploadPhotos(id, files, user.id);
  }

  @Post(':id/rules')
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async createRule(
    @Param('id') id: string,
    @Body() dto: CreateRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RuleResponseDto> {
    return this.rulesService.createRule(id, dto, user.id);
  }

  @Patch(':id/rules/:ruleId')
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async updateRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RuleResponseDto> {
    return this.rulesService.updateRule(id, ruleId, dto, user.id);
  }

  @Delete(':id/rules/:ruleId')
  @HttpCode(204)
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async deleteRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.rulesService.deleteRule(id, ruleId, user.id);
  }

  @Get(':id/rules')
  async getRules(@Param('id') id: string): Promise<RuleResponseDto[]> {
    return this.rulesService.getRules(id);
  }
}
