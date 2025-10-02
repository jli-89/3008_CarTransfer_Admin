import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverTracker } from './driver-tracker';

describe('DriverTracker', () => {
  let component: DriverTracker;
  let fixture: ComponentFixture<DriverTracker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverTracker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriverTracker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
