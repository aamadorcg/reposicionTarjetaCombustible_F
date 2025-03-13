import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonaFisicaComponent } from './persona-fisica.component';

describe('PersonaFisicaComponent', () => {
  let component: PersonaFisicaComponent;
  let fixture: ComponentFixture<PersonaFisicaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PersonaFisicaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonaFisicaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
