import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  template: `
    <div class="contact-page">
      <h1>Contact Us</h1>
      <p>If you have any questions or need assistance, please get in touch with us!</p>

      <div class="contact-details">
        <p><strong>Phone:</strong> <a href="tel:1300123456">1300 123 456</a></p>
        <p><strong>Email:</strong> <a href="mailto:support@yourcompany.com">auteslagmail.com</a></p>
        <p><strong>Address:</strong> 123 Truck Lane, Sydney, NSW</p>
        <p><strong>Business Hours:</strong> Monday – Friday, 9 AM – 6 PM</p>
      </div>

      <h2>Find Us Here</h2>
      <div class="map-container">
        <iframe
          title="Company Location"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3310.692354385308!2d151.2092956152091!3d-33.86514398065945!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6b12ae3fced9b1fb%3A0x5017d681632bac0!2sSydney%20NSW%2C%20Australia!5e0!3m2!1sen!2sus!4v1691225074930!5m2!1sen!2sus"
          width="100%"
          height="400"
          style="border:0;"
          allowfullscreen
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade">
        </iframe>
      </div>
    </div>
  `,
  styles: [`
    .contact-page {
      max-width: 700px;
      margin: 60px auto;
      padding: 25px 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }

    h1, h2 {
      color: #005a9e;
      margin-bottom: 15px;
    }

    p {
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 10px;
    }

    .contact-details p {
      font-weight: 500;
    }

    .contact-details a {
      color: #0078d4;
      text-decoration: none;
      transition: color 0.3s ease;
    }

    .contact-details a:hover {
      color: #004a8c;
      text-decoration: underline;
    }

    .map-container {
      margin-top: 35px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
  `]
})
export class Contact {}
