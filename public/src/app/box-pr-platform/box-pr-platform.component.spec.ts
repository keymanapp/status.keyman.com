import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxPrPlatformComponent } from './box-pr-platform.component';

describe('BoxPrPlatformComponent', () => {
  let component: BoxPrPlatformComponent;
  let fixture: ComponentFixture<BoxPrPlatformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BoxPrPlatformComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BoxPrPlatformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
