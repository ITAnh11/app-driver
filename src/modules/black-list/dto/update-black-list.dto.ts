import { PartialType } from '@nestjs/mapped-types';
import { CreateBlackListDto } from './create-black-list.dto';

export class UpdateBlackListDto extends PartialType(CreateBlackListDto) {}
