import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  LogService,
  OperationLogEntry,
  AuditLogEntry,
  PaginatedResult,
} from './log.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

type OperationSource = 'car_transport2' | 'car_transport_quotes';


interface LogTableState<T> {
  visible: boolean;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  data: T[];
}

interface FilterState {
  start: string;
  end: string;
  action: string;
  entityType: string;
  actor: string;
}

@Component({
  selector: 'app-log-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule,AdminHeaderComponent],
  templateUrl: './log-viewer.html',
  styleUrls: ['./log-viewer.css'],
})
export class LogViewerComponent implements OnInit {
  readonly operationSources: OperationSource[] = [
    'car_transport2',
    'car_transport_quotes',
  ];

  readonly operationActions = ['', 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'ASSIGN', 'EXPORT'];
  readonly operationEntityTypes = [
    '',
    'ORDER',
    'ITEM',
    'QUOTE',
    'TIMESHEET',
    'DAILY_REPORT',
    'LOCATION',
    'ROUTE_PRICE',
  ];
  readonly auditEventTypes = ['', 'LOGIN', 'ACCOUNT_ACTION'];

  filters: FilterState = {
    start: '',
    end: '',
    action: '',
    entityType: '',
    actor: '',
  };

  operationStates: Record<OperationSource, LogTableState<OperationLogEntry>> = {
    car_transport2: this.createTableState(true),
    car_transport_quotes: this.createTableState(true),
  };

  auditState: LogTableState<AuditLogEntry> = this.createTableState(true);

  constructor(private readonly logService: LogService) {}

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    (Object.keys(this.operationStates) as OperationSource[]).forEach((key) => {
      if (this.operationStates[key].visible) {
        this.loadOperationLogs(key);
      }
    });
    if (this.auditState.visible) {
      this.loadAuditLogs();
    }
  }

  applyFilters(): void {
    this.setPage('car_transport2', 1);
    this.setPage('car_transport_quotes', 1);
    this.setAuditPage(1);
    this.refreshAll();
  }

  toggleOperations(source: OperationSource): void {
    const state = this.operationStates[source];
    state.visible = !state.visible;
    if (state.visible && !state.data.length) {
      this.loadOperationLogs(source);
    }
  }

  toggleAudit(): void {
    this.auditState.visible = !this.auditState.visible;
    if (this.auditState.visible && !this.auditState.data.length) {
      this.loadAuditLogs();
    }
  }

  changePage(source: OperationSource, delta: number): void {
    const state = this.operationStates[source];
    const nextPage = Math.max(1, state.page + delta);
    if (nextPage === state.page) {
      return;
    }
    state.page = nextPage;
    this.loadOperationLogs(source);
  }

  changeAuditPage(delta: number): void {
    const nextPage = Math.max(1, this.auditState.page + delta);
    if (nextPage === this.auditState.page) {
      return;
    }
    this.auditState.page = nextPage;
    this.loadAuditLogs();
  }

  private loadOperationLogs(database: OperationSource): void {
    const state = this.operationStates[database];
    state.loading = true;
    state.error = null;
    this.logService
      .fetchOperationLogs({
        database,
        start: this.filters.start,
        end: this.filters.end,
        action: this.filters.action,
        entityType: this.filters.entityType,
        actor: this.filters.actor,
        page: state.page,
        pageSize: state.pageSize,
      })
      .subscribe({
        next: (res) => this.assignResult(state, res),
        error: (err) => {
          state.error = err.message ?? 'Failed to load operation logs.';
          state.loading = false;
        },
      });
  }

  private loadAuditLogs(): void {
    const state = this.auditState;
    state.loading = true;
    state.error = null;
    this.logService
      .fetchAuditLogs({
        database: 'car_transport_audit',
        start: this.filters.start,
        end: this.filters.end,
        actor: this.filters.actor,
        action: this.filters.action,
        entityType: this.filters.entityType,
        page: state.page,
        pageSize: state.pageSize,
      })
      .subscribe({
        next: (res) => this.assignResult(state, res),
        error: (err) => {
          state.error = err.message ?? 'Failed to load audit logs.';
          state.loading = false;
        },
      });
  }

  private assignResult<T>(state: LogTableState<T>, result: PaginatedResult<T>): void {
    state.data = result.data;
    state.page = result.page;
    state.pageSize = result.pageSize;
    state.total = result.total;
    state.loading = false;
  }

  private setPage(source: OperationSource, page: number): void {
    this.operationStates[source].page = page;
  }

  private setAuditPage(page: number): void {
    this.auditState.page = page;
  }

  private createTableState<T>(visible: boolean): LogTableState<T> {
    return {
      visible,
      loading: false,
      error: null,
      page: 1,
      pageSize: 20,
      total: 0,
      data: [],
    };
  }

  getPageCount(state: LogTableState<unknown>): number {
    return state.pageSize ? Math.max(1, Math.ceil(state.total / state.pageSize)) : 1;
  }
}
