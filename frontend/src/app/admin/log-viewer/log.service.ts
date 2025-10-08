import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface OperationLogEntry {
  op_id: number;
  op_time: string;
  actor_user_id: number | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: number;
  order_id: number | null;
  details: string | null;
  client_ip: string | null;
  user_agent: string | null;
  source: string;
}

export interface AuditLogEntry {
  audit_id: number;
  occurred_at: string;
  event_type: string;
  actor_user_id: number;
  target_user_id: number | null;
  crud_operation: string | null;
  action_description: string | null;
  login_success: number | null;
  ip_address: string | null;
  user_agent: string | null;
  source: string;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

interface ApiPaginatedResponse<T> {
  ok: boolean;
  data?: T[];
  page?: number;
  pageSize?: number;
  total?: number;
  error?: string;
}

export interface LogQueryOptions {
  database?: string;
  start?: string;
  end?: string;
  entityType?: string;
  action?: string;
  actor?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class LogService {
  private readonly baseUrl = `${environment.apiUrl}/logs`;

  constructor(private readonly http: HttpClient) {}

  fetchOperationLogs(options: LogQueryOptions): Observable<PaginatedResult<OperationLogEntry>> {
    const params = this.buildParams(options);
    return this.http
      .get<ApiPaginatedResponse<OperationLogEntry>>(`${this.baseUrl}/operations`, { params })
      .pipe(map(this.ensurePaginatedResult<OperationLogEntry>('Failed to load operation logs.')));
  }

  fetchAuditLogs(options: LogQueryOptions): Observable<PaginatedResult<AuditLogEntry>> {
    const params = this.buildParams(options);
    return this.http
      .get<ApiPaginatedResponse<AuditLogEntry>>(`${this.baseUrl}/audit`, { params })
      .pipe(map(this.ensurePaginatedResult<AuditLogEntry>('Failed to load audit logs.')));
  }

  private ensurePaginatedResult<T>(defaultError: string) {
    return (res: ApiPaginatedResponse<T>): PaginatedResult<T> => {
      if (!res.ok) {
        throw new Error(res.error ?? defaultError);
      }
      return {
        data: res.data ?? [],
        page: res.page ?? 1,
        pageSize: res.pageSize ?? 20,
        total: res.total ?? (res.data ? res.data.length : 0),
      };
    };
  }

  private buildParams(options: LogQueryOptions): HttpParams {
    let params = new HttpParams();
    if (options.database) {
      params = params.set('database', options.database);
    }
    if (options.start) {
      params = params.set('start', options.start);
    }
    if (options.end) {
      params = params.set('end', options.end);
    }
    if (options.entityType) {
      params = params.set('entityType', options.entityType);
    }
    if (options.action) {
      params = params.set('action', options.action);
    }
    if (options.actor) {
      params = params.set('actor', options.actor);
    }
    if (options.page) {
      params = params.set('page', String(options.page));
    }
    if (options.pageSize) {
      params = params.set('pageSize', String(options.pageSize));
    }
    return params;
  }
}
