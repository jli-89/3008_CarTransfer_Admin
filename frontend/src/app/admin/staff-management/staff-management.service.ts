// app/admin/staff-management/staff-management.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

//export type StaffRole = 'superadmin' | 'admin' | 'staff';
export type StaffRole = 'superadmin' | 'admin' | 'staff' | 'former employees';  // v2.1.1
export type StaffStatus = 'active' | 'inactive';

export interface StaffUser {
  user_id: number;
  user_name: string;
  user_group: StaffRole;
  real_name: string | null;
  email: string;
  status: StaffStatus;
  office_location: string | null;
}

export interface CreateStaffPayload {
  user_name: string;
  password: string;
  user_group: StaffRole;
  email: string;
  real_name?: string | null;
  status?: StaffStatus;
  office_location?: string | null;
}

export interface UpdateStaffPayload {
  user_name: string;
  user_group: StaffRole;
  email: string;
  real_name?: string | null;
  status: StaffStatus;
  office_location?: string | null;
}

interface ApiListUsersResponse {
  ok: boolean;
  data?: StaffUser[];
  error?: string;
}

interface ApiCreateUserResponse {
  ok: boolean;
  user_id?: number;
  error?: string;
}

interface ApiAffectResponse {
  ok: boolean;
  affectedRows?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class StaffManagementService {
  private readonly baseUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  listStaff(): Observable<StaffUser[]> {
    return this.http
      .get<ApiListUsersResponse>(this.baseUrl)
      .pipe(
        map((res: ApiListUsersResponse) => {
          if (!res.ok) {
            throw new Error(res.error ?? 'Failed to load staff list.');
          }
          return res.data ?? [];
        })
      );
  }

  createStaff(payload: CreateStaffPayload): Observable<number> {
    return this.http
      .post<ApiCreateUserResponse>(this.baseUrl, payload)
      .pipe(
        map((res: ApiCreateUserResponse) => {
          if (!res.ok || typeof res.user_id !== 'number') {
            throw new Error(res.error ?? 'Failed to create staff record.');
          }
          return res.user_id;
        })
      );
  }

  updateStaff(userId: number, payload: UpdateStaffPayload): Observable<void> {
    return this.http
      .put<ApiAffectResponse>(`${this.baseUrl}/${userId}`, payload)
      .pipe(
        map((res: ApiAffectResponse) => {
          if (!res.ok) {
            throw new Error(res.error ?? 'Failed to update staff record.');
          }
        })
      );
  }

  updateStatus(userId: number, status: StaffStatus): Observable<void> {
    return this.http
      .put<ApiAffectResponse>(`${this.baseUrl}/${userId}/status`, { status })
      .pipe(
        map((res: ApiAffectResponse) => {
          if (!res.ok) {
            throw new Error(res.error ?? 'Failed to update staff status.');
          }
        })
      );
  }

  resetPassword(userId: number, password: string): Observable<void> {
    return this.http
      .put<ApiAffectResponse>(`${this.baseUrl}/${userId}/password`, { password })
      .pipe(
        map((res: ApiAffectResponse) => {
          if (!res.ok) {
            throw new Error(res.error ?? 'Failed to reset password.');
          }
        })
      );
  }

  deleteStaff(userId: number): Observable<void> {
    return this.http
      .delete<ApiAffectResponse>(`${this.baseUrl}/${userId}`)
      .pipe(
        map((res: ApiAffectResponse) => {
          if (!res.ok) {
            throw new Error(res.error ?? 'Failed to delete staff.');
          }
        })
      );
  }

  /** 將用戶標記為 former employees */  // v2.1.1 新增 v2.1.0之後增加
  markAsFormer(userId: number): Observable<void> {
    return this.http
      .put<ApiAffectResponse>(`${this.baseUrl}/${userId}/mark-former`, {})
      .pipe(
        map((res: ApiAffectResponse) => {
          if (!res.ok) {
            throw new Error(res.error ?? 'Failed to mark user as former employee.');
          }
        })
      );
  }
}
