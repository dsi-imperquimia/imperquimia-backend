import { PartialType } from '@nestjs/mapped-types';
import { CreateHabilidadeDto } from './create-habilidade.dto';

export class UpdateHabilidadeDto extends PartialType(CreateHabilidadeDto) {
}
