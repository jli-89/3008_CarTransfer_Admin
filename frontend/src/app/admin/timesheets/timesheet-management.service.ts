import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type TimesheetSignerRole = 'employee' | 'manager';

export interface TimesheetSummary {
  timesheet_id: number;
  staff_user_id: number;
  staff_display_name: string | null;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  total_minutes: number | null;
  location: string | null;
  notes: string | null;
  status: TimesheetStatus;
  submitted_at: string;
  approved_by_user_id: number | null;
  approved_by_display_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  has_employee_signature: boolean;
  has_manager_signature: boolean;
}

export interface TimesheetSignature {
  signature_id: number;
  signer_role: TimesheetSignerRole;
  signed_by_user_id: number | null;
  signed_by_display_name: string | null;
  signed_at: string;
  signature_sha256: string | null;
  signature_data_url: string;
}

export interface TimesheetDetail extends TimesheetSummary {
  signatures: TimesheetSignature[];
}

export interface TimesheetListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TimesheetListResult {
  data: TimesheetSummary[];
  meta: TimesheetListMeta;
}

interface ApiTimesheetListResponse {
  ok: boolean;
  data?: TimesheetSummary[];
  meta?: TimesheetListMeta;
  error?: string;
}

interface ApiTimesheetResponse {
  ok: boolean;
  data?: TimesheetDetail;
  error?: string;
}

export interface TimesheetQuery {
  status?: TimesheetStatus | string;
  staff_user_id?: number;
  date_from?: string;
  date_to?: string;
}

export interface CreateTimesheetPayload {
  staff_user_id: number;
  work_date: string;
  start_time?: string | null;
  end_time?: string | null;
  total_minutes?: number | null;
  location?: string | null;
  notes?: string | null;
}

export interface UpdateTimesheetPayload {
  work_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  total_minutes?: number | null;
  location?: string | null;
  notes?: string | null;
  status?: TimesheetStatus;
  approved_by_user_id?: number | null;
}

export interface SignTimesheetPayload {
  signer_role: TimesheetSignerRole;
  signature_data_url: string;
}

export interface StaffOption {
  user_id: number;
  display: string;
  status: string;
}

interface ApiStaffResponse {
  ok: boolean;
  data?: Array<{
    user_id: number;
    user_name: string;
    real_name: string | null;
    status: string;
  }>;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class TimesheetManagementService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listTimesheets(query: TimesheetQuery, page = 1, pageSize = 20): Observable<TimesheetListResult> {
    let params = new HttpParams();

    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.staff_user_id !== undefined && query.staff_user_id !== null) {
      params = params.set('staff_user_id', String(query.staff_user_id));
    }
    if (query.date_from) {
      params = params.set('date_from', query.date_from);
    }
    if (query.date_to) {
      params = params.set('date_to', query.date_to);
    }

    params = params.set('page', String(page));
    params = params.set('pageSize', String(pageSize));

    return this.http
      .get<ApiTimesheetListResponse>(`${this.baseUrl}/timesheets`, { params })
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Unable to load timesheets');
          }
          return {
            data: res.data,
            meta: res.meta ?? {
              total: res.data.length,
              page,
              pageSize,
              totalPages: 1,
              hasMore: false,
            },
          };
        })
      );
  }

  listMyTimesheets(page = 1, pageSize = 20, query: TimesheetQuery = {}): Observable<TimesheetListResult> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (query.date_from) {
      params = params.set('date_from', query.date_from);
    }
    if (query.date_to) {
      params = params.set('date_to', query.date_to);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }

    return this.http
      .get<ApiTimesheetListResponse>(`${this.baseUrl}/my/timesheets`, { params })
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Unable to load your timesheets');
          }
          return {
            data: res.data,
            meta: res.meta ?? {
              total: res.data.length,
              page,
              pageSize,
              totalPages: 1,
              hasMore: false,
            },
          };
        })
      );
  }

  getTimesheet(timesheetId: number): Observable<TimesheetDetail> {
    return this.http
      .get<ApiTimesheetResponse>(`${this.baseUrl}/timesheets/${timesheetId}`)
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Unable to load timesheet');
          }
          return res.data;
        })
      );
  }

  createTimesheet(payload: CreateTimesheetPayload): Observable<TimesheetDetail> {
    return this.http
      .post<ApiTimesheetResponse>(`${this.baseUrl}/timesheets`, payload)
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Failed to create timesheet');
          }
          return res.data;
        })
      );
  }

  updateTimesheet(timesheetId: number, payload: UpdateTimesheetPayload): Observable<TimesheetDetail> {
    return this.http
      .put<ApiTimesheetResponse>(`${this.baseUrl}/timesheets/${timesheetId}`, payload)
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Failed to update timesheet');
          }
          return res.data;
        })
      );
  }

  signTimesheet(timesheetId: number, payload: SignTimesheetPayload): Observable<TimesheetDetail> {
    return this.http
      .post<ApiTimesheetResponse>(`${this.baseUrl}/timesheets/${timesheetId}/signature`, payload)
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Failed to record signature');
          }
          return res.data;
        })
      );
  }

  listStaffOptions(): Observable<StaffOption[]> {
    return this.http
      .get<ApiStaffResponse>(`${this.baseUrl}/users`)
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Failed to load staff list');
          }
          return res.data.map((user) => ({
            user_id: user.user_id,
            display: (user.real_name?.trim() || user.user_name)?.trim() || `#${user.user_id}`,
            status: user.status,
          }));
        })
      );
  }
}
