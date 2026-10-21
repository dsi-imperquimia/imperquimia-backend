import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const service = { signIn: jest.fn(), me: jest.fn() };
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ controllers: [AuthController], providers: [{ provide: AuthService, useValue: service }] }).compile();
    controller = module.get(AuthController);
  });
  it('envia las credenciales al servicio y devuelve su respuesta', async () => {
    service.signIn.mockResolvedValue({ access_token: 'token-prueba' });
    await expect(controller.signIn({email:'test@example.com',password:'prueba'})).resolves.toEqual({access_token:'token-prueba'});
    expect(service.signIn).toHaveBeenCalledWith('test@example.com','prueba');
  });
  it('consulta el usuario autenticado usando sub', async () => {
    service.me.mockResolvedValue({id:7});
    await expect(controller.me({sub:7,username:'test@example.com',iat:0,exp:9999999999})).resolves.toEqual({id:7});
    expect(service.me).toHaveBeenCalledWith(7);
  });
});
