import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <header>
      <nav class="navbar">
        <div class="nav-links">
          <a routerLink="/">Home</a>
          <a routerLink="/contact">Contact</a>
          <a routerLink="/quote">Quote & Booking</a>
          <a routerLink="/track/customer">Tracking</a>
          <a routerLink="/login">Log In</a>
          <a routerLink="/search">Search</a>
         </div>
        <div class="header-right">
          <span class="phone-number">📞 1300 123 456</span>
          <button class="booking-btn">Book Now</button>
        </div>
      </nav>
    </header>

    <div *ngIf="isHomePage()">
      <section class="hero">
        <h1>RELIABLE VEHICLE TRANSPORTATION</h1>
        <p class="subtitle">Nationwide Car Carrier Services</p>
        <div class="routes">
          <ul>
            <li>ADL TO MEL →</li>
            <li>ADL TO SYD →</li>
            <li>DWN TO SYD →</li>
            <li>DWN TO ADL →</li>
            <li>BNE TO NSW →</li>
          </ul>
          <ul>
            <li>ADL TO BNE →</li>
            <li>DWN TO BNE →</li>
            <li>BNE TO MEL →</li>
            <li>DWN TO VIC →</li>
          </ul>
        </div>
      </section>

      <section class="about-section">
        <img src="assets/TESLA.png" alt="Car Transporter" />
        <div class="about-overlay">
          <h2>About the Company</h2>
          <p>We specialize in reliable and secure vehicle transportation across Australia...</p>
          <button class="read-more">Read More</button>
        </div>
      </section>

      <section class="services">
        <h2>OUR SERVICES</h2>
        <div class="service-icons">
          <div><img src="assets/TRUCK_LOGO.png" alt="Truck Icon" /><p>Vehicles We Transport</p></div>
          <div><img src="assets/TRANSPORTATION_LOGO.png" alt="Map Icon" /><p>Transport Options</p></div>
          <div><img src="assets/ITEM_POLICY.png" alt="Box Icon" /><p>Personal Items Policy</p></div>
          <div><img src="assets/LOCATION_LOGO.png" alt="Storage Icon" /><p>Vehicle Storage</p></div>
        </div>
      </section>

      <section class="quote-booking-section" id="quote-booking">
        <h2>Get a Free Quote</h2>
        <p>Click below to get a quote and book your car transport easily.</p>
        <a routerLink="/quote" class="quote-button">Click Here to Get a Quote & Book</a>
      </section>

      <section class="tracking-section">
        <h2>Track Your Vehicle</h2>
        <div class="tracker-buttons">
          <a class="nav-button" routerLink="/track/driver">Driver Tracker</a>
          <a class="nav-button" routerLink="/track/customer">Customer Tracker</a>
        </div>
      </section>
    </div>

    <main>
      <router-outlet></router-outlet>
    </main>

    <footer>
      <div class="footer-left">
        <h3>Company Name</h3>
        <p>Australia Wide Transport</p>
        <p>123 Truck Lane, Sydney, NSW</p>
        <button>Read more</button>
      </div>
      <div class="footer-right">
        <h3>Contact Us</h3>
        <p>🕒 Mon–Fri: 9am–6pm</p>
        <p>📞 1300 123 456</p>
      </div>
      <div class="footer-bottom">
        <p>© 2025 Your Company Name. All rights reserved.</p>
        <a routerLink="/terms">Terms of Service</a> | <a routerLink="/privacy">Privacy Policy</a>
      </div>
    </footer>
  `,
  styleUrls: ['./app.css']
})
export class App {
  constructor(private location: Location) {}

  isHomePage(): boolean {
    return this.location.path() === '' || this.location.path() === '/';
  }
}