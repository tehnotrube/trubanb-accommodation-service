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
import { BlockedPeriodsService } from './blocks/blocked-periods.service';

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

import { CreateManualBlockDto } from './dto/create-manual-block.dto';
import { BlockResponseDto } from './dto/block.response.dto';

@Controller('accommodations')
export class AccommodationsController {
  constructor(
    private readonly accommodationsService: AccommodationsService,
    private readonly rulesService: AccommodationRulesService,
    private readonly blocksService: BlockedPeriodsService,
  ) {}

  @Post()
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async create(
    @Body() createAccommodationDto: CreateAccommodationDto,
  ): Promise<AccommodationResponseDto> {
    return this.accommodationsService.create(createAccommodationDto);
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
      user.email,
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
    await this.accommodationsService.remove(id, user.email);
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
    return this.accommodationsService.uploadPhotos(id, files, user.email);
  }

  @Post(':id/rules')
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async createRule(
    @Param('id') id: string,
    @Body() dto: CreateRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RuleResponseDto> {
    return this.rulesService.createRule(id, dto, user.email);
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
    return this.rulesService.updateRule(id, ruleId, dto, user.email);
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
    await this.rulesService.deleteRule(id, ruleId, user.email);
  }

  @Get(':id/rules')
  async getRules(@Param('id') id: string): Promise<RuleResponseDto[]> {
    return this.rulesService.getRules(id);
  }

  @Post(':id/blocks')
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async createManualBlock(
    @Param('id') id: string,
    @Body() dto: CreateManualBlockDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BlockResponseDto> {
    return this.blocksService.createManualBlock(id, dto, user.email);
  }

  @Delete(':id/blocks/:blockId')
  @HttpCode(204)
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async deleteManualBlock(
    @Param('id') id: string,
    @Param('blockId') blockId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.blocksService.deleteManualBlock(id, blockId, user.email);
  }
}
