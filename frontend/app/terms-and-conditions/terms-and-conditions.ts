import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // Import RouterLink here

@Component({
  selector: 'app-terms-and-conditions',
  standalone: true,
  imports: [CommonModule, RouterLink], // Add RouterLink to imports
  template: `
    <div class="terms-container">
      <h2>Terms & Conditions</h2>
      <p>Last Updated: August 5, 2025</p>

      <p>Welcome to our car transportation services. By accessing or using our services, you agree to be bound by these Terms and Conditions. Please read them carefully.</p>

      <h3>1. Services Provided</h3>
      <p>We provide instant quotes and booking services for vehicle transportation across Australia. Our services include a booking platform that facilitates the transport of vehicles from a pickup location to a delivery location, as specified by the customer.</p>

      <h3>2. Booking and Payment</h3>
      <p>All quotes are estimates and may be subject to change based on final details of the vehicle and transport requirements. A booking is confirmed only upon receipt of payment and a confirmation email from our service. Payment details, including accepted methods and cancellation policies, are specified at the time of booking.</p>

      <h3>3. Customer Responsibilities</h3>
      <p>You agree to provide accurate and complete information for all bookings, including vehicle details, pickup/delivery locations, and contact information. You are responsible for ensuring the vehicle is ready for transport and meets all specified conditions (e.g., driveable or non-driveable status).</p>

      <h3>4. Limitations of Liability</h3>
      <p>We are not liable for any loss or damage to your vehicle beyond the scope of our insurance policy. We are not responsible for delays caused by unforeseen circumstances, including but not limited to, weather conditions, mechanical failure, or road closures. Your use of this service is at your own risk.</p>
      
      <h3>5. Privacy Policy</h3>
      <p>Your privacy is important to us. We collect and use your personal information solely for the purpose of providing our services. We do not sell or share your data with third parties for marketing purposes. You can review our full Privacy Policy on our website.</p>

      <h3>6. Governing Law</h3>
      <p>These Terms and Conditions shall be governed by and construed in accordance with the laws of Australia. Any disputes arising from these terms will be subject to the exclusive jurisdiction of the courts of Australia.</p>

      <p class="final-note">If you do not agree with any part of these terms, you should not use our services. We recommend consulting a legal professional to ensure these terms are appropriate for your specific needs.</p>

      <a [routerLink]="['/quote']" class="back-link">← Back to Quote Form</a>
    </div>
  `,
  styleUrls: ['./terms-and-conditions.css']
})
export class TermsAndConditionsComponent { }