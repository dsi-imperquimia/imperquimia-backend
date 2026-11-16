import 'reflect-metadata';
import { MovimientoController } from '@/movimientos/controllers/movimiento.controller';

const permisoDe = (controller: object, metodo: string) =>
  Reflect.getMetadata(
    'catalogPermissions',
    controller[metodo as keyof typeof controller],
  );

describe('Permisos del controlador de movimientos', () => {
  it('protege la consulta y creación de movimientos', () => {
    const controller = MovimientoController.prototype;

    expect(permisoDe(controller, 'create')).toEqual(['HERRAMIENTA_UPDATE']);
    expect(permisoDe(controller, 'findAll')).toEqual(['HERRAMIENTA_READ']);
    expect(permisoDe(controller, 'findOne')).toEqual(['HERRAMIENTA_READ']);
  });
});
