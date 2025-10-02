import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormService } from '../services/form.service'; // Import the new service

@Component({
  selector: 'app-quote-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterLink],
  template: `
    <div class="quote-booking-container">
      <h2>Instant Car Transportation Quote</h2>
      <p>Enter your details below to get an instant quote and book your vehicle transportation.</p>

      <form #quoteForm="ngForm" class="quote-form" (ngSubmit)="onQuoteSubmit(quoteForm)">
        <div class="form-section">
          <h3>Quote Details</h3>
          <div class="form-row">
            <div class="form-group autocomplete-group">
              <label for="pickupLocation">Pick Up Suburb</label>
              <input type="text" id="pickupLocation" name="pickupLocation" (input)="filterSuburbs('pickup', $event)" [(ngModel)]="formData.pickupSuburb" autocomplete="off" placeholder="e.g., Sydney, NSW" required>
              <ul *ngIf="filteredPickupSuburbs.length > 0" class="autocomplete-list">
                <li *ngFor="let suburb of filteredPickupSuburbs" (click)="selectSuburb('pickup', suburb)">
                  {{ suburb.suburb }}, {{ suburb.state }} <span class="postcode">{{ suburb.postcode }}</span>
                </li>
              </ul>
            </div>
            <div class="form-group autocomplete-group">
              <label for="deliveryLocation">Delivery Suburb</label>
              <input type="text" id="deliveryLocation" name="deliveryLocation" (input)="filterSuburbs('delivery', $event)" [(ngModel)]="formData.deliverySuburb" autocomplete="off" placeholder="e.g., Melbourne, VIC" required>
              <ul *ngIf="filteredDeliverySuburbs.length > 0" class="autocomplete-list">
                <li *ngFor="let suburb of filteredDeliverySuburbs" (click)="selectSuburb('delivery', suburb)">
                  {{ suburb.suburb }}, {{ suburb.state }} <span class="postcode">{{ suburb.postcode }}</span>
                </li>
              </ul>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">First Name</label>
              <input type="text" id="firstName" name="firstName" [(ngModel)]="formData.firstName" required>
            </div>
            <div class="form-group">
              <label for="lastName">Last Name</label>
              <input type="text" id="lastName" name="lastName" [(ngModel)]="formData.lastName" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="phone">Phone Number</label>
              <input type="tel" id="phone" name="phone" [(ngModel)]="formData.phone" required>
            </div>
            <div class="form-group">
              <label for="email">Email Address</label>
              <input type="email" id="email" name="email" [(ngModel)]="formData.email" required>
            </div>
          </div>
        </div>

        <div class="vehicles-section">
          <h3>Vehicle Details</h3>
          <div *ngFor="let vehicle of formData.vehicles; let i = index" class="vehicle-card">
            <div class="vehicle-header">
              <h4>Vehicle {{ i + 1 }}</h4>
              <button *ngIf="formData.vehicles.length > 1" (click)="removeVehicle(i)" type="button" class="remove-btn">Remove Vehicle</button>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="make-{{i}}">Make</label>
                <input type="text" id="make-{{i}}" name="vehicle-{{i}}-make" [(ngModel)]="vehicle.make" required>
              </div>
              <div class="form-group">
                <label for="model-{{i}}">Model</label>
                <input type="text" id="model-{{i}}" name="vehicle-{{i}}-model" [(ngModel)]="vehicle.model" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="vehicleType-{{i}}">Vehicle Type</label>
                <select id="vehicleType-{{i}}" name="vehicle-{{i}}-type" [(ngModel)]="vehicle.type" required>
                  <option value="">Select</option>
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="Ute">Ute</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Van">Van</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label for="rego-{{i}}">Registration Number</label>
                <input type="text" id="rego-{{i}}" name="vehicle-{{i}}-rego" [(ngModel)]="vehicle.rego">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group radio-group">
                <label>Is Vehicle Driveable?</label>
                <div class="radio-options">
                  <label><input type="radio" name="vehicle-{{i}}-driveable" [value]="true" [(ngModel)]="vehicle.driveable">Yes</label>
                  <label><input type="radio" name="vehicle-{{i}}-driveable" [value]="false" [(ngModel)]="vehicle.driveable">No</label>
                </div>
              </div>
              <div class="form-group">
                <label for="value-{{i}}">Value less than $60k?</label>
                <select id="value-{{i}}" name="vehicle-{{i}}-value" [(ngModel)]="vehicle.value" required>
                  <option value="">Select</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
          </div>
          <button (click)="addVehicle()" type="button" class="add-vehicle-btn">Add another vehicle</button>
        </div>

        <div class="disclaimer-section">
          <label class="disclaimer-checkbox">
            <input type="checkbox" name="disclaimer" [(ngModel)]="formData.disclaimerAccepted" required>
            I have read and agree to the <a [routerLink]="['/terms']">Terms & Conditions</a>
          </label>
        </div>

        <button type="submit" class="submit-button" [disabled]="quoteForm.invalid">Next Step</button>
      </form>
      
      <p class="status-message" *ngIf="quoteSubmissionStatus">
        {{ quoteSubmissionStatus }}
      </p>
    </div>

    <div class="enquiries-container">
      <h3>Have an Enquiry?</h3>
      <p>For any questions or special requests, please use the form below.</p>
      <form #enquiryForm="ngForm" (ngSubmit)="onEnquirySubmit(enquiryForm)">
        <label>
          Your email:
          <input type="email" name="email" [(ngModel)]="enquiryEmail">
        </label>
        <label>
          Your message:
          <textarea name="message" [(ngModel)]="enquiryMessage"></textarea>
        </label>
        <button type="submit" class="enquiry-button">Send Enquiry</button>
      </form>

      <p class="status-message" *ngIf="enquirySubmissionStatus">
        {{ enquirySubmissionStatus }}
      </p>
    </div>
  `,
  styleUrls: ['./quote-booking.css']
})
export class QuoteBooking implements OnInit, OnDestroy {
  FORMSPREE_URL = 'https://formspree.io/f/manbdklg';

  quoteSubmissionStatus: string = '';
  enquirySubmissionStatus: string = '';

  enquiryEmail = '';
  enquiryMessage = '';
  
  // This object will hold all your form data
  formData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    pickupSuburb: '',
    deliverySuburb: '',
    vehicles: [{
      make: '',
      model: '',
      type: '',
      rego: '',
      driveable: null,
      value: ''
    }],
    disclaimerAccepted: false
  };

  allSuburbs = [
    { suburb: 'Sydney', state: 'NSW', postcode: '2000' },
    { suburb: 'Melbourne', state: 'VIC', postcode: '3000' },
    { suburb: 'Brisbane', state: 'QLD', postcode: '4000' },
    { suburb: 'Perth', state: 'WA', postcode: '6000' },
    { suburb: 'Adelaide', state: 'SA', postcode: '5000' },
    { suburb: 'Gold Coast', state: 'QLD', postcode: '4217' },
    { suburb: 'Canberra', state: 'ACT', postcode: '2601' },
    { suburb: 'Hobart', state: 'TAS', postcode: '7000' },
    { suburb: 'Darwin', state: 'NT', postcode: '0800' },
    { suburb: 'Barossa Goldfields', state: 'SA', postcode: '5351' },
    { suburb: 'Newcastle', state: 'NSW', postcode: '2300' },
    { suburb: 'Wollongong', state: 'NSW', postcode: '2500' },
    { suburb: 'Geelong', state: 'VIC', postcode: '3220' },
    { suburb: 'Townsville', state: 'QLD', postcode: '4810' },
    { suburb: 'Cairns', state: 'QLD', postcode: '4870' },
    { suburb: 'Toowoomba', state: 'QLD', postcode: '4350' },
    { suburb: 'Ballarat', state: 'VIC', postcode: '3350' },
    { suburb: 'Bendigo', state: 'VIC', postcode: '3550' },
    { suburb: 'Albury', state: 'NSW', postcode: '2640' }
  ];

  filteredPickupSuburbs: any[] = [];
  filteredDeliverySuburbs: any[] = [];

  constructor(private http: HttpClient, private formService: FormService) {}

  ngOnInit() {
    // Load the saved form data from the service when the component initializes
    if (Object.keys(this.formService.formData).length > 0) {
      this.formData = this.formService.formData;
    }
  }

  ngOnDestroy() {
    // Save the current form data to the service when the user leaves the page
    this.formService.formData = this.formData;
  }

  filterSuburbs(type: 'pickup' | 'delivery', event: any) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredList = this.allSuburbs.filter(s =>
      s.suburb.toLowerCase().startsWith(searchTerm) || s.postcode.startsWith(searchTerm)
    );

    if (type === 'pickup') {
      this.filteredPickupSuburbs = searchTerm ? filteredList : [];
    } else {
      this.filteredDeliverySuburbs = searchTerm ? filteredList : [];
    }
  }

  selectSuburb(type: 'pickup' | 'delivery', suburb: any) {
    const selectedText = `${suburb.suburb}, ${suburb.state}, ${suburb.postcode}`;
    if (type === 'pickup') {
      this.formData.pickupSuburb = selectedText;
      this.filteredPickupSuburbs = [];
    } else {
      this.formData.deliverySuburb = selectedText;
      this.filteredDeliverySuburbs = [];
    }
  }

  addVehicle() {
    this.formData.vehicles.push({
      make: '',
      model: '',
      type: '',
      rego: '',
      driveable: null,
      value: ''
    });
  }

  removeVehicle(index: number) {
    if (this.formData.vehicles.length > 1) {
      this.formData.vehicles.splice(index, 1);
    }
  }

  onQuoteSubmit(form: NgForm) {
    if (form.invalid) {
      this.quoteSubmissionStatus = 'Please fill out all required fields.';
      return;
    }

    const formData = {
      ...this.formData,
      'form-name': 'Instant Car Transportation Quote'
    };

    this.http.post(this.FORMSPREE_URL, formData).subscribe({
      next: () => {
        this.quoteSubmissionStatus = 'Thank you! Your quote request has been sent successfully.';
        
        // Clear the form data from the service after submission
        this.formService.formData = {};
        
        // Reset the component's form data
        this.formData = {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          pickupSuburb: '',
          deliverySuburb: '',
          vehicles: [{ make: '', model: '', type: '', rego: '', driveable: null, value: '' }],
          disclaimerAccepted: false
        };
        form.resetForm();
      },
      error: (error) => {
        console.error('Submission error:', error);
        this.quoteSubmissionStatus = 'An error occurred. Please try again or check your Formspree setup.';
      }
    });
  }

  onEnquirySubmit(form: NgForm) {
    if (form.invalid) {
      this.enquirySubmissionStatus = 'Please fill out all required fields.';
      return;
    }

    const formData = {
      email: this.enquiryEmail,
      message: this.enquiryMessage,
      'form-name': 'Enquiry Form'
    };
    
    this.http.post(this.FORMSPREE_URL, formData).subscribe({
      next: () => {
        this.enquirySubmissionStatus = 'Thank you! Your enquiry has been sent successfully.';
        this.enquiryEmail = '';
        this.enquiryMessage = '';
        form.resetForm();
      },
      error: (error) => {
        console.error('Submission error:', error);
        this.enquirySubmissionStatus = 'An error occurred. Please try again or check your Formspree setup.';
      }
    });
  }
}