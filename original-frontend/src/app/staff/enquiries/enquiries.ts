import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-enquiries',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './enquiries.html',
  styleUrls: ['./enquiries.css']
})
export class EnquiriesComponent {
  // This array will hold the enquiries received via email
  enquiries = [
    {
      id: 1,
      clientName: 'Alice Johnson',
      email: 'alice@example.com',
      submittedDate: '2025-09-12',
      message: 'I want to transport my car from Sydney to Melbourne.'
    },
    {
      id: 2,
      clientName: 'Mark Smith',
      email: 'mark@example.com',
      submittedDate: '2025-09-11',
      message: 'Need a quote for transporting two cars.'
    }
    // You can dynamically push new email enquiries here
  ];

  searchTerm: string = '';

  // Filter function only considers Name, Email, Date, and Message
  filterEnquiries(items: any[]) {
    if (!this.searchTerm) return items;
    const term = this.searchTerm.toLowerCase();
    return items.filter(i =>
      i.clientName.toLowerCase().includes(term) ||
      i.email.toLowerCase().includes(term) ||
      i.submittedDate.toLowerCase().includes(term) ||
      i.message.toLowerCase().includes(term)
    );
  }
}
