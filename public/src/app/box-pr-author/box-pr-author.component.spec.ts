import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxPrAuthorComponent } from './box-pr-author.component';

describe('BoxPrAuthorComponent', () => {
  let component: BoxPrAuthorComponent;
  let fixture: ComponentFixture<BoxPrAuthorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BoxPrAuthorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BoxPrAuthorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
