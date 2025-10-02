import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-customer-enquiries',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './customer-enquiries.html',
  styleUrls: ['./customer-enquiries.css']
})
export class CustomerEnquiriesComponent implements OnInit {
  customerEnquiries: any[] = [];
  searchTerm: string = '';

  // 🔔 Notifications
  notifications: { id: number, message: string, createdAt: string, status: 'read' | 'unread' }[] = [];
  unreadCount: number = 0;
  dropdownOpen: boolean = false;

  ngOnInit() {
    const saved = localStorage.getItem('customerEnquiries');
    this.customerEnquiries = saved ? JSON.parse(saved) : [];

    this.loadNotifications();
  }

  // ---------------- Enquiries Logic ----------------
  addNewEnquiry() {
    const newId = this.customerEnquiries.length
      ? Math.max(...this.customerEnquiries.map(e => e.id)) + 1
      : 1;
    this.customerEnquiries.push({
      id: newId,
      clientName: '',
      email: '',
      itemCount: 0,
      pickupSuburb: '',
      deliverySuburb: '',
      firstName: '',
      lastName: '',
      phone: '',
      vehicleDetails: '',
      submittedDate: new Date().toISOString().split('T')[0],
      status: 'Not Started',
      message: '',
      submitted: false
    });
    this.saveToLocal();
  }

  updateField(item: any, field: string, value: any) {
    if (!item.submitted) {
      item[field] = value;
      this.saveToLocal();
    }
  }

  submitEnquiry(item: any) {
    item.submitted = true;
    this.saveToLocal();
    alert(`Enquiry ${item.id} submitted and locked.`);
  }

  filterItems(items: any[]) {
    if (!this.searchTerm) return items;
    const term = this.searchTerm.toLowerCase();
    return items.filter(i =>
      ['clientName', 'email', 'submittedDate', 'message'].some(field =>
        (i[field] as string).toLowerCase().includes(term)
      )
    );
  }

  saveToLocal() {
    localStorage.setItem('customerEnquiries', JSON.stringify(this.customerEnquiries));
  }

  // ---------------- Summary Helpers ----------------
  getNewTasksCount(): number {
    return this.customerEnquiries.filter(e => !e.submitted).length;
  }

  getPendingTasksCount(): number {
    return this.customerEnquiries.filter(e => e.status !== 'Resolved').length;
  }

  // ---------------- Notifications ----------------
  loadNotifications() {
    // Mock data (later replaced with backend API call)
    this.notifications = [
      { id: 1, message: 'New enquiry assigned to you', createdAt: '2025-09-16 14:30', status: 'unread' },
      { id: 2, message: 'Booking #88 updated by admin', createdAt: '2025-09-16 13:05', status: 'read' }
    ];
    this.updateUnreadCount();
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  markAsRead(notification: any) {
    notification.status = 'read';
    this.updateUnreadCount();
    // later: backend API call goes here
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => n.status === 'unread').length;
  }
}
