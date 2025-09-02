import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DeployBoxComponent } from './deploy-box.component';

describe('DeployBoxComponent', () => {
  let component: DeployBoxComponent;
  let fixture: ComponentFixture<DeployBoxComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DeployBoxComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DeployBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
