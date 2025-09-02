import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContributionsHomeComponent } from './contributions-home.component';

describe('ContributionsHomeComponent', () => {
  let component: ContributionsHomeComponent;
  let fixture: ComponentFixture<ContributionsHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ContributionsHomeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ContributionsHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
