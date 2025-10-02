import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuoteBooking } from './quote-booking';

describe('QuoteBooking', () => {
  let component: QuoteBooking;
  let fixture: ComponentFixture<QuoteBooking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuoteBooking]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuoteBooking);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
