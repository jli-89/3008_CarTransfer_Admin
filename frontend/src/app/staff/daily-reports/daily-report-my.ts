import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  DailyReportDetail,
  DailyReportListMeta,
  DailyReportQuery,
  DailyReportService,
  DailyReportSummary
} from '../../admin/daily-reports/daily-report.service'; // ✅ 復用 admin 的 service
import { StaffHeaderComponent } from '../../shared/staff-header/staff-header';


@Component({
  selector: 'app-staff-daily-report-my',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StaffHeaderComponent],
  templateUrl: './daily-report-my.html',
  styleUrls: ['./daily-report-my.css'],
})
export class DailyReportMyComponent implements OnInit {
  filters: DailyReportQuery = {};
  reports: DailyReportSummary[] = [];
  selectedReport: DailyReportDetail | null = null;
  meta: DailyReportListMeta | null = null;
  currentPage = 1;
  pageSize = 20;

  isLoadingList = false;
  isLoadingDetail = false;
  errorMessage: string | null = null;
  detailError: string | null = null;

  constructor(private readonly dailyReportService: DailyReportService) {}

  ngOnInit(): void {
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

  nextPage(): void {
    if (this.meta && this.currentPage < this.meta.totalPages) {
      this.currentPage++;
      this.fetchReports(false);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchReports(false);
    }
  }

  refreshCurrentPage(): void {
    this.fetchReports(false);
  }

  selectReport(report: DailyReportSummary): void {
    if (this.selectedReport?.report_id === report.report_id) {
      return;
    }
    this.loadDetail(report.report_id);
  }

  private fetchReports(resetSelection: boolean = true): void {
    this.isLoadingList = true;
    this.errorMessage = null;
    this.dailyReportService
      .listMyReports(this.currentPage, this.pageSize, this.filters)
      .subscribe({
        next: (result) => {
          this.reports = result.data;
          this.meta = result.meta;
          this.currentPage = result.meta.page;
          this.pageSize = result.meta.pageSize;
          this.isLoadingList = false;
          if (resetSelection) this.selectedReport = null;
        },
        error: (err) => {
          this.errorMessage = err instanceof Error ? err.message : 'Unable to load my reports.';
          this.isLoadingList = false;
        },
      });
  }

  loadDetail(reportId: number): void {
    this.isLoadingDetail = true;
    this.detailError = null;
    // ✅ 改為調用 staff 專用的 my/daily-reports/:id API
    this.dailyReportService.getMyReport(reportId).subscribe({
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

  displayText(value: string | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
    const trimmed = `${value}`.trim();
    return trimmed ? trimmed : 'N/A';
  }

  statusClass(status: string | null | undefined): string {
    if (!status) return 'status-unknown';
    return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  }
}
