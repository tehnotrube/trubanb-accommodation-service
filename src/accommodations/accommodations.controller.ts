import { Controller, Get, Param, Delete, Query } from '@nestjs/common';
import { AccommodationsService } from './accommodations.service';
import { GetAccommodationsDto } from './dto/get-accommodations.dto';

@Controller('accommodations')
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
  remove(@Param('id') id: string) {
    return this.accommodationsService.remove(+id);
  }
}
