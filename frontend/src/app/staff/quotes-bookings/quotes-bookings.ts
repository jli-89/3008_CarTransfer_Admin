import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-quotes-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './quotes-bookings.html', // Ensure this file exists
  styleUrls: ['./quotes-bookings.css']
})
export class QuotesBookingsComponent {
  quotesBookings: any[] = [
    {
      id: 201,
      clientName: 'Sarah Lee',
      email: 'sarah@example.com',
      itemCount: 3,
      pickupSuburb: 'Sydney, NSW',
      deliverySuburb: 'Melbourne, VIC',
      firstName: 'Sarah',
      lastName: 'Lee',
      phone: '0412345678',
      vehicleDetails: 'Vehicle 1: Toyota Corolla, Sedan',
      submittedDate: '2025-09-11',
      status: 'Not Started',
      message: 'Need 3 cars for delivery'
    },
    {
      id: 202,
      clientName: 'John Doe',
      email: 'john@example.com',
      itemCount: 1,
      pickupSuburb: 'Brisbane, QLD',
      deliverySuburb: 'Gold Coast, QLD',
      firstName: 'John',
      lastName: 'Doe',
      phone: '0498765432',
      vehicleDetails: 'Vehicle 1: Ford Ranger, Ute',
      submittedDate: '2025-09-12',
      status: 'In Progress',
      message: 'Pickup request for 1 car'
    }
  ];

  searchTerm: string = '';

  /**
   * Advanced filter: searches across multiple fields
   * - ID, Client Name, Email, Item Count, Pickup/Delivery Suburb
   * - First/Last Name, Phone, Vehicle Details, Date, Status, Message
   * - Case-insensitive partial match
   */
  filterItems(items: any[]) {
    if (!this.searchTerm) return items;

    const term = this.searchTerm.toLowerCase();

    return items.filter(item =>
      [
        item.id,
        item.clientName,
        item.email,
        item.itemCount,
        item.pickupSuburb,
        item.deliverySuburb,
        item.firstName,
        item.lastName,
        item.phone,
        item.vehicleDetails,
        item.submittedDate,
        item.status,
        item.message
      ].some(field => field?.toString().toLowerCase().includes(term))
    );
  }

  updateStatus(item: any, status: string) {
    item.status = status;
  }
}
