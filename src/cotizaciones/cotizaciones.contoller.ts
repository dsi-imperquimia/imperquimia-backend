import {
  Body,
  Controller,
  Get,
  Put,
  Param,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CotizacionService } from './cotizaciones.service';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

type RequestWithUser = Request & {
  user: {
    sub: number;
    username: string;
    iat: number;
    exp: number;
  };
};

@Controller('cotizaciones')
export class CotizacionController {
  constructor(private readonly cotizacionService: CotizacionService) {}

  @Get()
  async getAllCotizaciones() {
    return this.cotizacionService.getAllCotizaciones();
  }

  @Get(':id')
  async getCotizacionById(@Param('id') id: string) {
    const cotizacion = await this.cotizacionService.getCotizacionById(
      Number(id),
    );

    if (!cotizacion) {
      throw new BadRequestException('No se encontró la cotización.');
    }

    return cotizacion;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createCotizacion(
    @Body() data: CreateCotizacionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.cotizacionService.createCotizacion(data, req.user.sub);
  }

  @Put(':id')
  async updateCotizacion(
    @Param('id') id: string,
    @Body() data: UpdateCotizacionDto,
  ) {
    const cotizacionFound = await this.cotizacionService.getCotizacionById(
      Number(id),
    );

    if (!cotizacionFound) {
      throw new BadRequestException('No se encontró la cotización.');
    }

    return this.cotizacionService.updateCotizacion(Number(id), data);
  }
}
