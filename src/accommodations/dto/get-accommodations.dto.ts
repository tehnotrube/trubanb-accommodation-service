import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class GetAccommodationsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  location?: string;
}
