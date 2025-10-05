import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  StaffManagementService,
  StaffRole,
  StaffStatus,
  StaffUser
} from './staff-management.service';

interface StaffRow {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
  username: string;
  status: StaffStatus;
}

interface StaffFormState {
  name: string;
  email: string;
  role: StaffRole;
  username: string;
  password: string;
}

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-management.html',
  styleUrls: ['./staff-management.css']
})
export class StaffManagementComponent implements OnInit {
  staffList: StaffRow[] = [];
  showAddForm = false;
  isLoading = false;
  isSaving = false;
  errorMessage: string | null = null;

  newStaff: StaffFormState = this.createEmptyForm();

  constructor(private staffService: StaffManagementService) {}

  ngOnInit(): void {
    this.fetchStaff();
  }

  openAddStaffForm(): void {
    this.showAddForm = true;
    this.newStaff = this.createEmptyForm();
    this.errorMessage = null;
  }

  cancelAddStaff(): void {
    this.showAddForm = false;
    this.errorMessage = null;
  }

  addStaff(): void {
    this.errorMessage = null;

    const trimmedName = this.newStaff.name.trim();
    const trimmedEmail = this.newStaff.email.trim();
    const trimmedUsername = this.newStaff.username.trim();
    const password = this.newStaff.password;

    if (!trimmedName || !trimmedEmail || !trimmedUsername || !password) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    const role = (this.newStaff.role || 'staff').toLowerCase() as StaffRole;
    if (!this.isValidRole(role)) {
      this.errorMessage = 'Role must be admin, staff, or superadmin.';
      return;
    }

    this.isSaving = true;

    this.staffService
      .createStaff({
        user_name: trimmedUsername,
        password,
        user_group: role,
        email: trimmedEmail,
        real_name: trimmedName,
        status: 'active'
      })
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.showAddForm = false;
          this.newStaff = this.createEmptyForm();
          this.fetchStaff();
        },
        error: (error) => {
          this.errorMessage = this.toErrorMessage(error, 'Failed to create staff member.');
        }
      });
  }

  toggleStatus(staff: StaffRow): void {
    const nextStatus: StaffStatus = staff.status === 'active' ? 'inactive' : 'active';
    this.errorMessage = null;

    this.staffService.updateStatus(staff.id, nextStatus).subscribe({
      next: () => {
        this.staffList = this.staffList.map((s) =>
          s.id === staff.id ? { ...s, status: nextStatus } : s
        );
      },
      error: (error) => {
        this.errorMessage = this.toErrorMessage(error, 'Failed to update staff status.');
      }
    });
  }

  resetPassword(staff: StaffRow): void {
    const newPassword = prompt(`Enter new password for ${staff.name || staff.username}:`);
    if (!newPassword || !newPassword.trim()) {
      return;
    }

    this.errorMessage = null;

    this.staffService.resetPassword(staff.id, newPassword.trim()).subscribe({
      next: () => {
        alert(`Password updated for ${staff.name || staff.username}`);
      },
      error: (error) => {
        this.errorMessage = this.toErrorMessage(error, 'Failed to reset password.');
      }
    });
  }

  deleteStaff(staff: StaffRow): void {
    if (!confirm(`Are you sure you want to delete ${staff.name || staff.username}?`)) {
      return;
    }

    this.errorMessage = null;

    this.staffService.deleteStaff(staff.id).subscribe({
      next: () => {
        this.staffList = this.staffList.filter((s) => s.id !== staff.id);
      },
      error: (error) => {
        this.errorMessage = this.toErrorMessage(error, 'Failed to delete staff member.');
      }
    });
  }

  private fetchStaff(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.staffService
      .listStaff()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (users) => {
          this.staffList = users.map((user) => this.mapUserToRow(user));
        },
        error: (error) => {
          this.errorMessage = this.toErrorMessage(error, 'Unable to load staff list.');
        }
      });
  }

  private mapUserToRow(user: StaffUser): StaffRow {
    return {
      id: user.user_id,
      name: user.real_name?.trim() || user.user_name,
      email: user.email,
      role: user.user_group,
      username: user.user_name,
      status: user.status
    };
  }

  private createEmptyForm(): StaffFormState {
    return {
      name: '',
      email: '',
      role: 'staff',
      username: '',
      password: ''
    };
  }

  private isValidRole(role: string): role is StaffRole {
    return role === 'staff' || role === 'admin' || role === 'superadmin';
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      const maybeHttpError = error as {
        error?: { error?: string; message?: string };
        message?: string;
      };

      return (
        maybeHttpError.error?.error ||
        maybeHttpError.error?.message ||
        maybeHttpError.message ||
        fallback
      );
    }

    return fallback;
  }
}

