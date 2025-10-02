import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-management.html',
  styleUrls: ['./staff-management.css']
})
export class StaffManagementComponent {
  staffList: any[] = [];
  showAddForm: boolean = false;

  newStaff = {
    name: '',
    email: '',
    role: '',
    username: '',
    password: '' // ✅ Admin sets initial password
  };

  constructor() {
    this.loadStaff();
  }

  loadStaff() {
    const saved = localStorage.getItem('staffList');
    this.staffList = saved ? JSON.parse(saved) : [];
  }

  saveStaff() {
    localStorage.setItem('staffList', JSON.stringify(this.staffList));
  }

  openAddStaffForm() {
    this.showAddForm = true;
    this.newStaff = { name: '', email: '', role: '', username: '', password: '' };
  }

  cancelAddStaff() {
    this.showAddForm = false;
  }

  addStaff() {
    if (!this.newStaff.name || !this.newStaff.email || !this.newStaff.username || !this.newStaff.password) {
      alert('Please fill in all required fields.');
      return;
    }

    const newId = this.staffList.length ? this.staffList.length + 1 : 1;

    const staff = {
      id: newId,
      name: this.newStaff.name,
      email: this.newStaff.email,
      role: this.newStaff.role || 'Employee',
      username: this.newStaff.username,
      password: this.newStaff.password, // ✅ Saved for login
      status: 'Active'
    };

    this.staffList.push(staff);
    this.saveStaff();
    this.showAddForm = false;
  }

  toggleStatus(staff: any) {
    staff.status = staff.status === 'Active' ? 'Inactive' : 'Active';
    this.saveStaff();
  }

  // ✅ Reset password (admin controlled)
  resetPassword(staff: any) {
    const newPass = prompt(`Enter new password for ${staff.name}:`);
    if (newPass && newPass.trim() !== '') {
      staff.password = newPass;
      this.saveStaff();
      alert(`Password updated for ${staff.name}`);
    }
  }

  deleteStaff(staff: any) {
    if (confirm(`Are you sure you want to delete ${staff.name}?`)) {
      this.staffList = this.staffList.filter(s => s.id !== staff.id);
      this.saveStaff();
    }
  }
}
