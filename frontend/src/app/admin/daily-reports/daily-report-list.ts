import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import {
  DailyReportDetail,
  DailyReportListMeta,
  DailyReportQuery,
  DailyReportService,
  DailyReportSummary,
} from './daily-report.service';
import { TimesheetManagementService, StaffOption } from '../timesheets/timesheet-management.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-daily-report-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AdminHeaderComponent],
  templateUrl: './daily-report-list.html',
  styleUrls: ['./daily-report-list.css'],
})
export class DailyReportListComponent implements OnInit {
  @Input() showCreateButton = true;
  @Input() showMyReportsLink = true;

  filters: DailyReportQuery = {};
  staffOptions: StaffOption[] = [];

  reports: DailyReportSummary[] = [];
  selectedReport: DailyReportDetail | null = null;
  meta: DailyReportListMeta | null = null;
  currentPage = 1;
  pageSize = 20;

  isLoadingList = false;
  isLoadingDetail = false;
  errorMessage: string | null = null;
  detailError: string | null = null;

  constructor(
    private readonly dailyReportService: DailyReportService,
    private readonly staffService: TimesheetManagementService
  ) {}

  ngOnInit(): void {
    this.staffService.listStaffOptions().subscribe({
      next: (options) => (this.staffOptions = options),
      error: () => (this.staffOptions = []),
    });
    this.fetchReports();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.fetchReports();
  }

  clearFilters(): void {
    this.filters = {};
    this.currentPage = 1;
    this.fetchReports();
  }

  goToPage(page: number): void {
    if (!this.meta) {
      return;
    }
    const totalPages = this.meta.totalPages || 1;
    const target = Math.min(Math.max(page, 1), totalPages);
    if (target === this.currentPage) {
      return;
    }
    this.currentPage = target;
    this.fetchReports(false);
  }

  nextPage(): void {
    if (this.meta && this.currentPage < this.meta.totalPages) {
      this.currentPage += 1;
      this.fetchReports(false);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
      this.fetchReports(false);
    }
  }

  selectReport(report: DailyReportSummary): void {
    if (this.selectedReport?.report_id === report.report_id) {
      return;
    }
    this.loadDetail(report.report_id);
  }

  refreshCurrentPage(): void {
    this.fetchReports(false);
  }

  private fetchReports(resetSelection: boolean = true): void {
    this.isLoadingList = true;
    this.errorMessage = null;
    this.dailyReportService
      .listReports(this.filters, this.currentPage, this.pageSize)
      .subscribe({
        next: (result) => {
          this.reports = result.data;
          this.meta = result.meta;
          this.currentPage = result.meta.page;
          this.pageSize = result.meta.pageSize;
          this.isLoadingList = false;

          if (resetSelection) {
            this.selectedReport = null;
          } else if (this.selectedReport) {
            const match = result.data.find((row) => row.report_id === this.selectedReport!.report_id);
            if (!match) {
              this.selectedReport = null;
            } else {
              this.selectedReport = {
                ...this.selectedReport,
                ...match,
              };
            }
          }
        },
        error: (err) => {
          this.errorMessage = err instanceof Error ? err.message : 'Unable to load daily reports.';
          this.isLoadingList = false;
        },
      });
  }

  loadDetail(reportId: number): void {
    this.isLoadingDetail = true;
    this.detailError = null;
    this.dailyReportService.getReport(reportId).subscribe({
      next: (detail) => {
        this.selectedReport = detail;
        this.isLoadingDetail = false;
      },
      error: (err) => {
        this.detailError = err instanceof Error ? err.message : 'Unable to load report.';
        this.selectedReport = null;
        this.isLoadingDetail = false;
      },
    });
  }

  statusClass(status: string | null | undefined): string {
    if (!status) {
      return 'status-unknown';
    }
    return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  }

  displayStaffName(report: { staff_name?: string | null; staff_user_id?: number | null }): string {
    const staffName = report.staff_name?.trim();
    if (staffName) {
      return staffName;
    }
    if (report.staff_user_id) {
      return `#${report.staff_user_id}`;
    }
    return 'N/A';
  }

  displayText(value: string | null | undefined): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    const trimmed = `${value}`.trim();
    return trimmed ? trimmed : 'N/A';
  }
}

