import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityQueueComponent } from './community-queue.component';

describe('CommunityQueueComponent', () => {
  let component: CommunityQueueComponent;
  let fixture: ComponentFixture<CommunityQueueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CommunityQueueComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CommunityQueueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
