import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxPrStatusComponent } from './box-pr-status.component';

describe('BoxPrStatusComponent', () => {
  let component: BoxPrStatusComponent;
  let fixture: ComponentFixture<BoxPrStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BoxPrStatusComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BoxPrStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
