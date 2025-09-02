import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxPrProjectComponent } from './box-pr-project.component';

describe('BoxPrProjectComponent', () => {
  let component: BoxPrProjectComponent;
  let fixture: ComponentFixture<BoxPrProjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BoxPrProjectComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BoxPrProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
