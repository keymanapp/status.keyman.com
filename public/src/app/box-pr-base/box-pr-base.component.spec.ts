import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxPrBaseComponent } from './box-pr-base.component';

describe('BoxPrBaseComponent', () => {
  let component: BoxPrBaseComponent;
  let fixture: ComponentFixture<BoxPrBaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BoxPrBaseComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BoxPrBaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
