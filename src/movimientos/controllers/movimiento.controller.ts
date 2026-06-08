import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MovimientoService } from '../service/movimiento.service';
import { CreateMovimientoDto } from '../dto/create-movimiento.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('movimientos')
export class MovimientoController { //  Verifica que se exporte correctamente aquí
  constructor(private readonly movimientoService: MovimientoService) {}

  // POST /movimientos
  @Post()
  create(@Body() dto: CreateMovimientoDto, @Request() req: any) {
    // Si tu JWT guarda el identificador bajo 'id', req.user.id funcionará.
    // Si sigue llegando undefined, cambia req.user.id por req.user.sub
    const userId = req.user?.id || req.user?.sub; 
    return this.movimientoService.create(dto, userId);
  }

  // GET /movimientos
  @Get()
  findAll(@Query('herramientaId') herramientaId?: string) {
    const id = herramientaId ? parseInt(herramientaId, 10) : undefined;
    return this.movimientoService.findAll(id);
  }

  // GET /movimientos/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.movimientoService.findOne(id);
  }
}