import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardPdfComponent } from './card-pdf.component';

describe('CardPdfComponent', () => {
  let component: CardPdfComponent;
  let fixture: ComponentFixture<CardPdfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CardPdfComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardPdfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
