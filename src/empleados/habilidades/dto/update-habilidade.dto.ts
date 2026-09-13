import { PartialType } from '@nestjs/swagger';
import { CreateHabilidadeDto } from './create-habilidade.dto';

export class UpdateHabilidadeDto extends PartialType(CreateHabilidadeDto) {
}
