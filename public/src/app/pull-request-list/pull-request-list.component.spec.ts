import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PullRequestListComponent } from './pull-request-list.component';

describe('PullRequestListComponent', () => {
  let component: PullRequestListComponent;
  let fixture: ComponentFixture<PullRequestListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PullRequestListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PullRequestListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
