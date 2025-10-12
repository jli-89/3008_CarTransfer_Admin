import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface DailyReportClient {
  client_id: number;
  ordinal_no: number;
  client_name: string | null;
  details: string | null;
  notes: string | null;
  action_required: string | null;
  status: 'Solved' | 'Not Solved' | 'Complete';
  extra_json: any;
  created_at: string;
  updated_at: string;
}

export interface DailyReportSummary {
  report_id: number;
  report_date: string;
  start_time: string | null;
  end_time: string | null;
  staff_user_id: number | null;
  staff_name: string | null;
  created_at: string;
  updated_at: string;
  client_count: number;
}

export interface DailyReportDetail extends DailyReportSummary {
  clients: DailyReportClient[];
}

export interface DailyReportListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

interface ApiDailyReportListResponse {
  ok: boolean;
  data?: DailyReportSummary[];
  meta?: DailyReportListMeta;
  error?: string;
}

interface ApiDailyReportResponse {
  ok: boolean;
  data?: DailyReportDetail;
  error?: string;
}

export interface DailyReportQuery {
  staff_user_id?: number | string;
  date_from?: string;
  date_to?: string;
  status?: string;
}

export interface DailyReportClientPayload {
  ordinal_no?: number;
  client_name?: string | null;
  details?: string | null;
  notes?: string | null;
  action_required?: string | null;
  status?: 'Solved' | 'Not Solved' | 'Complete';
  extra_json?: any;
}

export interface CreateDailyReportPayload {
  report_date: string;
  start_time?: string | null;
  end_time?: string | null;
  staff_user_id?: number;
  staff_name?: string | null;
  clients: DailyReportClientPayload[];
}

export interface DailyReportListResult {
  data: DailyReportSummary[];
  meta: DailyReportListMeta;
}

@Injectable({ providedIn: 'root' })
export class DailyReportService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  listReports(
    query: DailyReportQuery,
    page = 1,
    pageSize = 20
  ): Observable<DailyReportListResult> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (query.staff_user_id !== undefined && query.staff_user_id !== null && query.staff_user_id !== '') {
      params = params.set('staff_user_id', String(query.staff_user_id));
    }
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
      .get<ApiDailyReportListResponse>(`${this.baseUrl}/daily-reports`, { params })
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Unable to load daily reports');
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

  listMyReports(page = 1, pageSize = 20, query: DailyReportQuery = {}): Observable<DailyReportListResult> {
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
      .get<ApiDailyReportListResponse>(`${this.baseUrl}/my/daily-reports`, { params })
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Unable to load your daily reports');
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

  getReport(reportId: number): Observable<DailyReportDetail> {
    return this.http
      .get<ApiDailyReportResponse>(`${this.baseUrl}/daily-reports/${reportId}`)
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Unable to load daily report');
          }
          return res.data;
        })
      );
  }

  createReport(payload: CreateDailyReportPayload): Observable<DailyReportDetail> {
    return this.http
      .post<ApiDailyReportResponse>(`${this.baseUrl}/daily-reports`, payload)
      .pipe(
        map((res) => {
          if (!res.ok || !res.data) {
            throw new Error(res.error ?? 'Failed to create daily report');
          }
          return res.data;
        })
      );
  }

  getMyReport(reportId: number): Observable<DailyReportDetail> {
  return this.http
    .get<ApiDailyReportResponse>(`${this.baseUrl}/my/daily-reports/${reportId}`)
    .pipe(
      map((res) => {
        if (!res.ok || !res.data) {
          throw new Error(res.error ?? 'Unable to load my daily report');
        }
        return res.data;
      })
    );
}

}
