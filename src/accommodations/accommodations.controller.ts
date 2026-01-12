import {
  Controller,
  Get,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AccommodationsService } from './accommodations.service';
import { GetAccommodationsDto } from './dto/get-accommodations.dto';
import { KongJwtGuard } from '../auth/guards/kong-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('api/accommodations')
export class AccommodationsController {
  constructor(private readonly accommodationsService: AccommodationsService) {}

  @Get()
  findAll(@Query() getAccommodationsDto: GetAccommodationsDto) {
    return this.accommodationsService.findAll(getAccommodationsDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accommodationsService.findOne(+id);
  }

  @Delete(':id')
  @UseGuards(KongJwtGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.ADMIN)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.accommodationsService.remove(+id);
  }
}
