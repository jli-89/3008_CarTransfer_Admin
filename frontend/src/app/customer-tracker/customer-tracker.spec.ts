import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerTracker } from './customer-tracker';

describe('CustomerTracker', () => {
  let component: CustomerTracker;
  let fixture: ComponentFixture<CustomerTracker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerTracker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerTracker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
