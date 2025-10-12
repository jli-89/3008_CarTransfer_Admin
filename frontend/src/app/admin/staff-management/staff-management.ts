// // app/admin/staff-management/staff-management.ts
// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { finalize } from 'rxjs/operators';

// import {
//   StaffManagementService,
//   StaffRole,
//   StaffStatus,
//   StaffUser
// } from './staff-management.service';

// import { DashboardService } from '../dashboard/dashboard.service'; // ✅ 確保這行正確導入

// interface StaffRow {
//   id: number;
//   name: string;
//   realName: string | null;
//   email: string;
//   role: StaffRole;
//   username: string;
//   status: StaffStatus;
//   officeLocation: string | null;
// }

// interface StaffFormState {
//   name: string;
//   email: string;
//   role: StaffRole;
//   username: string;
//   password: string;
//   officeLocation: string;
// }

// interface StaffEditFormState {
//   name: string;
//   email: string;
//   role: StaffRole;
//   username: string;
//   status: StaffStatus;
//   officeLocation: string;
// }
// // 這個型別可以留在類別
// type CurrentUser = {
//   user_id: number;
//   user_name: string;
//   real_name?: string | null;
//   email?: string | null;
//   office_location?: string | null;
// };





// @Component({
//   selector: 'app-staff-management',
//   standalone: true,
//   imports: [CommonModule, FormsModule],
//   templateUrl: './staff-management.html',
//   styleUrls: ['./staff-management.css']
// })
// export class StaffManagementComponent implements OnInit {
//   staffList: StaffRow[] = [];
//   showAddForm = false;
//   isLoading = false;
//   isSaving = false;
//   isUpdating = false;
//   errorMessage: string | null = null;
  

//   /** Toggle between active staff and deleted employees */
//   showDeletedOnly = false;

//   newStaff: StaffFormState = this.createEmptyForm();

//   editingStaffId: number | null = null;
//   editStaff: StaffEditFormState | null = null;
//   // －－－－把這些搬到類別裡－－－－
//   currentUser: CurrentUser | null = null;
//   isEditingProfile = false;
//   isSavingProfile = false;
//   profileMessage: string | null = null;

//   profileLoaded = false;
//   profileLoadError: string | null = null;


//   editProfileForm = {
//     name: '',
//     email: '',
//     officeLocation: '',
//     password: ''
//   };



//   constructor(private staffService: StaffManagementService,
//               private dashboardService: DashboardService // ✅ 新增
//   ) {}

//   ngOnInit(): void {
//     this.fetchStaff();
//     this.loadCurrentUser(); // ✅ 新增
//   }

//   /** ✅ 載入當前登入使用者資料 */
// private loadCurrentUser(): void {
//     this.profileMessage = null;
//     this.profileLoadError = null;

  
//   this.dashboardService.getCurrentUser().subscribe({
//     next: (user: unknown) => {
//       const u = user as CurrentUser;  // ← 這一行很重要
//       this.currentUser = u;
//       this.editProfileForm = {
//         name: u.real_name || '',
//         email: u.email || '',
//         officeLocation: u.office_location || '',
//         password: ''
//       };
//     },
//     // ✅ 這段是你要的：顯示 HTTP 狀態碼與訊息
//     error: (err) => {
//       const code = (err && typeof err === 'object' && 'status' in err) ? (err as any).status : 'N/A';
//       const msg =
//         (err?.error && (err.error.error || err.error.message)) ||
//         err?.message ||
//         'Unknown';
//       this.profileLoadError = `Failed to load current user. HTTP ${code}: ${msg}`;
//       this.profileLoaded = true;// 仍然渲染卡片，只是顯示錯誤    }
//     },
//   });
// }



//     /** ✅ 開始編輯自己資料 */
//   editMyProfile(): void {
//     this.isEditingProfile = true;
//     this.profileMessage = null;
//   }

//   /** ✅ 取消編輯 */
//   cancelEditMyProfile(): void {
//     this.isEditingProfile = false;
//     this.profileMessage = null;
//   }

//   /** ✅ 保存自己的修改 */
//   saveMyProfile(): void {
//     if (!this.currentUser) return;

//     const payload: any = {
//       real_name: this.editProfileForm.name.trim(),
//       email: this.editProfileForm.email.trim(),
//       office_location: this.editProfileForm.officeLocation.trim()
//     };

//     if (this.editProfileForm.password.trim()) {
//       payload.password = this.editProfileForm.password.trim();
//     }

//     this.isSavingProfile = true;
//     this.dashboardService.updateCurrentUser(this.currentUser.user_id, payload).subscribe({
//       next: () => {
//         this.isSavingProfile = false;
//         this.profileMessage = 'Profile updated successfully.';
//         this.isEditingProfile = false;
//         this.currentUser = {
//           ...this.currentUser,
//           ...payload
//         };
//       },
//       error: (error) => {
//         this.isSavingProfile = false;
//         this.profileMessage = error.error?.message || 'Failed to update profile.';
//       }
//     });
//   }




//   /** Filter list based on the deleted toggle */
//   filteredStaffList(): StaffRow[] {
//     return this.staffList.filter(row =>
//       this.showDeletedOnly ? row.role === 'deleted employees'
//                           : row.role !== 'deleted employees'
//     );
//   }

//   openAddStaffForm(): void {
//     this.cancelEditStaff();
//     this.showAddForm = true;
//     this.newStaff = this.createEmptyForm();
//     this.errorMessage = null;
//   }

//   cancelAddStaff(): void {
//     this.showAddForm = false;
//     this.errorMessage = null;
//   }

//   addStaff(): void {
//     this.errorMessage = null;

//     const trimmedName = this.newStaff.name.trim();
//     const trimmedEmail = this.newStaff.email.trim();
//     const trimmedUsername = this.newStaff.username.trim();
//     const trimmedOffice = this.newStaff.officeLocation.trim();
//     const password = this.newStaff.password;

//     if (!trimmedName || !trimmedEmail || !trimmedUsername || !password) {
//       this.errorMessage = 'Please fill in all required fields.';
//       return;
//     }

//     const role = (this.newStaff.role || 'staff').toLowerCase() as StaffRole;
//     if (role !== 'admin' && role !== 'staff') {
//       this.errorMessage = 'Role must be admin or staff.';
//       return;
//     }
//     if (!this.isValidRole(role)) {
//       this.errorMessage = 'Role must be admin, staff, superadmin, or deleted employees.';
//       return;
//     }

//     this.isSaving = true;

//     this.staffService
//       .createStaff({
//         user_name: trimmedUsername,
//         password,
//         user_group: role,
//         email: trimmedEmail,
//         real_name: trimmedName,
//         status: 'active',
//         office_location: trimmedOffice ? trimmedOffice : null
//       })
//       .pipe(finalize(() => (this.isSaving = false)))
//       .subscribe({
//         next: () => {
//           this.showAddForm = false;
//           this.newStaff = this.createEmptyForm();
//           this.fetchStaff();
//         },
//         error: (error) => {
//           this.errorMessage = this.toErrorMessage(error, 'Failed to create staff member.');
//         }
//       });
//   }

//   openEditStaff(staff: StaffRow): void {
//     this.errorMessage = null;
//     this.editingStaffId = staff.id;
//     this.editStaff = {
//       name: staff.realName || '',
//       email: staff.email,
//       role: staff.role,
//       username: staff.username,
//       status: staff.status,
//       officeLocation: staff.officeLocation || ''
//     };
//   }

//   cancelEditStaff(): void {
//     this.editingStaffId = null;
//     this.editStaff = null;
//   }

//   saveEditStaff(): void {
//     if (this.editingStaffId === null || !this.editStaff) {
//       return;
//     }

//     this.errorMessage = null;

//     const trimmedName = this.editStaff.name.trim();
//     const trimmedEmail = this.editStaff.email.trim();
//     const trimmedUsername = this.editStaff.username.trim();
//     const trimmedOffice = this.editStaff.officeLocation.trim();
//     const role = this.editStaff.role;
//     const status = this.editStaff.status;

//     if (!trimmedEmail || !trimmedUsername) {
//       this.errorMessage = 'Email and username are required.';
//       return;
//     }

//     if (!this.isValidRole(role)) {
//       this.errorMessage = 'Role must be admin, staff, superadmin, or deleted employees.';
//       return;
//     }

//     if (!this.isValidStatus(status)) {
//       this.errorMessage = 'Status must be active or inactive.';
//       return;
//     }

//     const normalizedRealName = trimmedName || null;
//     const normalizedOffice = trimmedOffice || null;

//     this.isUpdating = true;

//     this.staffService
//       .updateStaff(this.editingStaffId, {
//         user_name: trimmedUsername,
//         user_group: role,
//         email: trimmedEmail,
//         real_name: normalizedRealName,
//         status,
//         office_location: normalizedOffice
//       })
//       .pipe(finalize(() => (this.isUpdating = false)))
//       .subscribe({
//         next: () => {
//           this.staffList = this.staffList.map((row) =>
//             row.id === this.editingStaffId
//               ? {
//                   ...row,
//                   name: normalizedRealName || trimmedUsername,
//                   realName: normalizedRealName,
//                   email: trimmedEmail,
//                   role,
//                   username: trimmedUsername,
//                   status,
//                   officeLocation: normalizedOffice
//                 }
//               : row
//           );
//           this.cancelEditStaff();
//         },
//         error: (error) => {
//           this.errorMessage = this.toErrorMessage(error, 'Failed to update staff member.');
//         }
//       });
//   }

//   toggleStatus(staff: StaffRow): void {
//     const nextStatus: StaffStatus = staff.status === 'active' ? 'inactive' : 'active';
//     this.errorMessage = null;

//     this.staffService.updateStatus(staff.id, nextStatus).subscribe({
//       next: () => {
//         this.staffList = this.staffList.map((s) =>
//           s.id === staff.id ? { ...s, status: nextStatus } : s
//         );

//         if (this.editingStaffId === staff.id && this.editStaff) {
//           this.editStaff.status = nextStatus;
//         }
//       },
//       error: (error) => {
//         this.errorMessage = this.toErrorMessage(error, 'Failed to update staff status.');
//       }
//     });
//   }

//   resetPassword(staff: StaffRow): void {
//     const newPassword = prompt(`Enter new password for ${staff.name || staff.username}:`);
//     if (!newPassword || !newPassword.trim()) {
//       return;
//     }

//     this.errorMessage = null;

//     this.staffService.resetPassword(staff.id, newPassword.trim()).subscribe({
//       next: () => {
//         alert(`Password updated for ${staff.name || staff.username}`);
//       },
//       error: (error) => {
//         this.errorMessage = this.toErrorMessage(error, 'Failed to reset password.');
//       }
//     });
//   }

//   /** ??:???? */
//   markAsDeleted(staff: StaffRow): void {
//     this.errorMessage = null;
//     this.isUpdating = true;

//     this.staffService
//       .markAsDeleted(staff.id)
//       .pipe(finalize(() => (this.isUpdating = false)))
//       .subscribe({
//         next: () => {
//           this.staffList = this.staffList.map((row) =>
//             row.id === staff.id ? { ...row, role: 'deleted employees', status: 'inactive' } : row
//           );

//           if (this.editingStaffId === staff.id && this.editStaff) {
//             this.editStaff.role = 'deleted employees';
//             this.editStaff.status = 'inactive';
//           }
//         },
//         error: (error) => {
//           this.errorMessage = this.toErrorMessage(error, 'Failed to mark as deleted.');
//         }
//       });
//   }

//   deleteStaff(staff: StaffRow): void {
//     if (!confirm(`Are you sure you want to delete ${staff.name || staff.username}?`)) {
//       return;
//     }

//     this.errorMessage = null;

//     this.staffService.deleteStaff(staff.id).subscribe({
//       next: () => {
//         this.staffList = this.staffList.filter((s) => s.id !== staff.id);
//         if (this.editingStaffId === staff.id) {
//           this.cancelEditStaff();
//         }
//       },
//       error: (error) => {
//         this.errorMessage = this.toErrorMessage(error, 'Failed to delete staff member.');
//       }
//     });
//   }

//   private fetchStaff(): void {
//     this.isLoading = true;
//     this.errorMessage = null;

//     this.staffService
//       .listStaff()
//       .pipe(finalize(() => (this.isLoading = false)))
//       .subscribe({
//         next: (users) => {
//           this.staffList = users.map((user) => this.mapUserToRow(user));
//         },
//         error: (error) => {
//           this.errorMessage = this.toErrorMessage(error, 'Unable to load staff list.');
//         }
//       });
//   }

//   private mapUserToRow(user: StaffUser): StaffRow {
//     const realName = user.real_name?.trim() || null;
//     const officeLocation = user.office_location?.trim() || null;

//     const normalizedRole: StaffRole = (user.user_group === 'former employees' ? 'deleted employees' : user.user_group) as StaffRole;

//     return {
//       id: user.user_id,
//       name: realName || user.user_name,
//       realName,
//       email: user.email,
//       role: normalizedRole,
//       username: user.user_name,
//       status: user.status,
//       officeLocation
//     };
//   }

//   private createEmptyForm(): StaffFormState {
//     return {
//       name: '',
//       email: '',
//       role: 'staff',
//       username: '',
//       password: '',
//       officeLocation: ''
//     };
//   }

//   private isValidRole(role: string): role is StaffRole {
//     //return role === 'staff' || role === 'admin' || role === 'superadmin';
//     return role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'deleted employees';
//   }

//   private isValidStatus(status: string): status is StaffStatus {
//     return status === 'active' || status === 'inactive';
//   }

//   private toErrorMessage(error: unknown, fallback: string): string {
//     if (typeof error === 'string') {
//       return error;
//     }

//     if (error && typeof error === 'object') {
//       const maybeHttpError = error as {
//         error?: { error?: string; message?: string };
//         message?: string;
//       };

//       return (
//         maybeHttpError.error?.error ||
//         maybeHttpError.error?.message ||
//         maybeHttpError.message ||
//         fallback
//       );
//     }

//     return fallback;
//   }
// }








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

import { DashboardService, CurrentUser } from '../dashboard/dashboard.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

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
  selector: 'app-staff-management',
  standalone: true,
  imports: [CommonModule, FormsModule,AdminHeaderComponent],
  templateUrl: './staff-management.html',
  styleUrls: ['./staff-management.css']
})
export class StaffManagementComponent implements OnInit {
  // ====== My Profile ======
  currentUser: CurrentUser | null = null;
  isEditingProfile = false;
  isSavingProfile = false;
  isLoadingProfile = false;
  profileMessage: string | null = null;
  editProfileForm = {
    name: '',
    email: '',
    officeLocation: '',
    password: ''
  };

  // ====== Staff list ======
  staffList: StaffRow[] = [];
  showAddForm = false;
  isLoading = false;
  isSaving = false;
  isUpdating = false;
  errorMessage: string | null = null;

  showDeletedOnly = false;

  newStaff: StaffFormState = this.createEmptyForm();

  editingStaffId: number | null = null;
  editStaff: StaffEditFormState | null = null;

  constructor(
    private staffService: StaffManagementService,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.fetchStaff();
    this.loadCurrentUser();
  }

  // ====== My Profile ======
  private loadCurrentUser(): void {
    this.isLoadingProfile = true;
    this.profileMessage = null;

    this.dashboardService
      .getCurrentUser()
      .pipe(finalize(() => (this.isLoadingProfile = false)))
      .subscribe({
        next: (u) => {
          // u 已是純使用者物件（因為 service 做了 map(res => res.data)）
          this.currentUser = u;
          this.editProfileForm = {
            name: u.real_name || '',
            email: u.email || '',
            officeLocation: u.office_location || '',
            password: ''
          };
        },
        error: (err) => {
          const msg =
            err?.error?.error ||
            err?.error?.message ||
            err?.message ||
            'Failed to load current user. (Check API/proxy)';
          this.profileMessage = `Failed to load current user. ${msg}`;
        }
      });
  }

  editMyProfile(): void {
    this.isEditingProfile = true;
    this.profileMessage = null;
  }

  cancelEditMyProfile(): void {
    this.isEditingProfile = false;
    this.profileMessage = null;
  }

  saveMyProfile(): void {
    if (!this.currentUser) return;

    const payload: any = {
      real_name: this.editProfileForm.name.trim(),
      email: this.editProfileForm.email.trim(),
      office_location: this.editProfileForm.officeLocation.trim()
    };

    if (this.editProfileForm.password.trim()) {
      payload.password = this.editProfileForm.password.trim();
    }

    this.isSavingProfile = true;

    this.dashboardService
      .updateCurrentUser(this.currentUser.user_id, payload)
      .pipe(finalize(() => (this.isSavingProfile = false)))
      .subscribe({
        next: (newUser) => {
          this.profileMessage = 'Profile updated successfully.';
          this.isEditingProfile = false;
          this.currentUser = newUser;
          this.editProfileForm.password = '';
        },
        error: (err) => {
          const msg =
            err?.error?.error ||
            err?.error?.message ||
            err?.message ||
            'Failed to update profile.';
          this.profileMessage = msg;
        }
      });
  }

  // ====== Staff list ======
  filteredStaffList(): StaffRow[] {
    return this.staffList.filter(row =>
      this.showDeletedOnly ? row.role === 'deleted employees' : row.role !== 'deleted employees'
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
    if (this.editingStaffId === null || !this.editStaff) return;

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
    return role === 'staff' || role === 'admin' || role === 'superadmin' || role === 'deleted employees';
  }

  private isValidStatus(status: string): status is StaffStatus {
    return status === 'active' || status === 'inactive';
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'string') return error;

    if (error && typeof error === 'object') {
      const maybeHttpError = error as {
        error?: { error?: string; message?: string };
        message?: string;
        status?: number;
      };

      const code = maybeHttpError.status ? ` (HTTP ${maybeHttpError.status})` : '';
      return (
        (maybeHttpError.error?.error || maybeHttpError.error?.message || maybeHttpError.message) + code ||
        fallback
      );
    }

    return fallback;
  }
}
