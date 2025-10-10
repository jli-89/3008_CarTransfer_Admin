// app/admin/staff-management/staff-management.ts
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
  realName: string | null;
  email: string;
  role: StaffRole;
  username: string;
  status: StaffStatus;
  officeLocation: string | null;
}

interface StaffFormState {
  name: string;
  email: string;
  role: StaffRole;
  username: string;
  password: string;
  officeLocation: string;
}

interface StaffEditFormState {
  name: string;
  email: string;
  role: StaffRole;
  username: string;
  status: StaffStatus;
  officeLocation: string;
}

@Component({
  selector: 'app-staff-self-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-management.html',
  styleUrls: ['./staff-management.css']
})
export class StaffSelfManagementComponent  implements OnInit {
  staffList: StaffRow[] = [];
  showAddForm = false;
  isLoading = false;
  isSaving = false;
  isUpdating = false;
  errorMessage: string | null = null;

  /** Toggle between active staff and deleted employees */
  showDeletedOnly = false;

  newStaff: StaffFormState = this.createEmptyForm();

  editingStaffId: number | null = null;
  editStaff: StaffEditFormState | null = null;

  constructor(private staffService: StaffManagementService) {}

  ngOnInit(): void {
    this.fetchStaff();
  }

  /** Filter list based on the deleted toggle */
  filteredStaffList(): StaffRow[] {
    return this.staffList.filter(row =>
      this.showDeletedOnly ? row.role === 'deleted employees'
                          : row.role !== 'deleted employees'
    );
  }

  openAddStaffForm(): void {
    this.cancelEditStaff();
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
    const trimmedOffice = this.newStaff.officeLocation.trim();
    const password = this.newStaff.password;

    if (!trimmedName || !trimmedEmail || !trimmedUsername || !password) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    const role = (this.newStaff.role || 'staff').toLowerCase() as StaffRole;
    if (role !== 'admin' && role !== 'staff') {
      this.errorMessage = 'Role must be admin or staff.';
      return;
    }
    if (!this.isValidRole(role)) {
      this.errorMessage = 'Role must be admin, staff, superadmin, or deleted employees.';
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
        status: 'active',
        office_location: trimmedOffice ? trimmedOffice : null
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

  openEditStaff(staff: StaffRow): void {
    this.errorMessage = null;
    this.editingStaffId = staff.id;
    this.editStaff = {
      name: staff.realName || '',
      email: staff.email,
      role: staff.role,
      username: staff.username,
      status: staff.status,
      officeLocation: staff.officeLocation || ''
    };
  }

  cancelEditStaff(): void {
    this.editingStaffId = null;
    this.editStaff = null;
  }

  saveEditStaff(): void {
    if (this.editingStaffId === null || !this.editStaff) {
      return;
    }

    this.errorMessage = null;

    const trimmedName = this.editStaff.name.trim();
    const trimmedEmail = this.editStaff.email.trim();
    const trimmedUsername = this.editStaff.username.trim();
    const trimmedOffice = this.editStaff.officeLocation.trim();
    const role = this.editStaff.role;
    const status = this.editStaff.status;

    if (!trimmedEmail || !trimmedUsername) {
      this.errorMessage = 'Email and username are required.';
      return;
    }

    if (!this.isValidRole(role)) {
      this.errorMessage = 'Role must be admin, staff, superadmin, or deleted employees.';
      return;
    }

    if (!this.isValidStatus(status)) {
      this.errorMessage = 'Status must be active or inactive.';
      return;
    }

    const normalizedRealName = trimmedName || null;
    const normalizedOffice = trimmedOffice || null;

    this.isUpdating = true;

    this.staffService
      .updateStaff(this.editingStaffId, {
        user_name: trimmedUsername,
        user_group: role,
        email: trimmedEmail,
        real_name: normalizedRealName,
        status,
        office_location: normalizedOffice
      })
      .pipe(finalize(() => (this.isUpdating = false)))
      .subscribe({
        next: () => {
          this.staffList = this.staffList.map((row) =>
            row.id === this.editingStaffId
              ? {
                  ...row,
                  name: normalizedRealName || trimmedUsername,
                  realName: normalizedRealName,
                  email: trimmedEmail,
                  role,
                  username: trimmedUsername,
                  status,
                  officeLocation: normalizedOffice
                }
              : row
          );
          this.cancelEditStaff();
        },
        error: (error) => {
          this.errorMessage = this.toErrorMessage(error, 'Failed to update staff member.');
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

        if (this.editingStaffId === staff.id && this.editStaff) {
          this.editStaff.status = nextStatus;
        }
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

  /** ??:???? */
  markAsDeleted(staff: StaffRow): void {
    this.errorMessage = null;
    this.isUpdating = true;

    this.staffService
      .markAsDeleted(staff.id)
      .pipe(finalize(() => (this.isUpdating = false)))
      .subscribe({
        next: () => {
          this.staffList = this.staffList.map((row) =>
            row.id === staff.id ? { ...row, role: 'deleted employees', status: 'inactive' } : row
          );

          if (this.editingStaffId === staff.id && this.editStaff) {
            this.editStaff.role = 'deleted employees';
            this.editStaff.status = 'inactive';
          }
        },
        error: (error) => {
          this.errorMessage = this.toErrorMessage(error, 'Failed to mark as deleted.');
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
        if (this.editingStaffId === staff.id) {
          this.cancelEditStaff();
        }
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
    const realName = user.real_name?.trim() || null;
    const officeLocation = user.office_location?.trim() || null;

    const normalizedRole: StaffRole = (user.user_group === 'former employees' ? 'deleted employees' : user.user_group) as StaffRole;

    return {
      id: user.user_id,
      name: realName || user.user_name,
      realName,
      email: user.email,
      role: normalizedRole,
      username: user.user_name,
      status: user.status,
      officeLocation
    };
  }

  private createEmptyForm(): StaffFormState {
    return {
      name: '',
      email: '',
      role: 'staff',
      username: '',
      password: '',
      officeLocation: ''
    };
  }

  private isValidRole(role: string): role is StaffRole {
    //return role === 'staff' || role === 'admin' || role === 'superadmin';
    return role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'deleted employees';
  }

  private isValidStatus(status: string): status is StaffStatus {
    return status === 'active' || status === 'inactive';
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
