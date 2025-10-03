import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './staff-dashboard.html',
  styleUrls: ['./staff-dashboard.css']
})
export class StaffDashboardComponent {
  assignedInquiries = [
    { id: 101, clientName: 'Alice Johnson', status: 'Not Started', submittedDate: '2025-09-12', itemCount: 2 },
    { id: 102, clientName: 'Mark Smith', status: 'In Progress', submittedDate: '2025-09-10', itemCount: 1 }
  ];

  quotesBookings = [
    { id: 201, clientName: 'Sarah Lee', email: 'sarah@example.com', itemCount: 3, submittedDate: '2025-09-11', status: 'Not Started', message: 'Need 3 cars for delivery' },
    { id: 202, clientName: 'John Doe', email: 'john@example.com', itemCount: 1, submittedDate: '2025-09-12', status: 'In Progress', message: 'Pickup request for 1 car' }
  ];

  searchTerm: string = '';

filterItems(items: any[]): any[] {
  if (!this.searchTerm) return items;

  return items.filter(i =>
    Object.values(i).some(val => {
      if (val === null || val === undefined) return false;
      // Convert to string, and allow both case-sensitive and insensitive match
      const strVal = val.toString();
      return strVal.includes(this.searchTerm) || strVal.toLowerCase().includes(this.searchTerm.toLowerCase());
    })
  );
}


  updateInquiryStatus(id: number, status: string, type: 'enquiry' | 'quote') {
    if (type === 'enquiry') {
      const inquiry = this.assignedInquiries.find(i => i.id === id);
      if (inquiry) inquiry.status = status;
    } else {
      const quote = this.quotesBookings.find(q => q.id === id);
      if (quote) quote.status = status;
    }
  }
}
