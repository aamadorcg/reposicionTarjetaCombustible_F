import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonaMoralComponent } from './persona-moral.component';

describe('PersonaMoralComponent', () => {
  let component: PersonaMoralComponent;
  let fixture: ComponentFixture<PersonaMoralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PersonaMoralComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonaMoralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
