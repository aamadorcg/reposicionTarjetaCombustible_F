import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReposicionTarjetaCombustibleComponent } from './reposicion-tarjeta-combustible.component';

describe('ReposicionTarjetaCombustibleComponent', () => {
  let component: ReposicionTarjetaCombustibleComponent;
  let fixture: ComponentFixture<ReposicionTarjetaCombustibleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReposicionTarjetaCombustibleComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReposicionTarjetaCombustibleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
