import { TestBed } from '@angular/core/testing';

import { ReposicionTarjetaService } from './reposicion-tarjeta.service';

describe('ReposicionTarjetaService', () => {
  let service: ReposicionTarjetaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReposicionTarjetaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
