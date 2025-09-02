import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformTierBoxComponent } from './platform-tier-box.component';

describe('PlatformTierBoxComponent', () => {
  let component: PlatformTierBoxComponent;
  let fixture: ComponentFixture<PlatformTierBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlatformTierBoxComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlatformTierBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
