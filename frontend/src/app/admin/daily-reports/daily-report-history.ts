import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  DailyReportListMeta,
  DailyReportQuery,
  DailyReportService,
  DailyReportSummary,
} from './daily-report.service';

@Component({
  selector: 'app-daily-report-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './daily-report-history.html',
  styleUrls: ['./daily-report-history.css'],
})
export class DailyReportHistoryComponent implements OnInit {
  filters: Pick<DailyReportQuery, 'date_from' | 'date_to' | 'status'> = {};

  reports: DailyReportSummary[] = [];
  meta: DailyReportListMeta | null = null;
  currentPage = 1;
  pageSize = 20;

  isLoading = false;
  errorMessage: string | null = null;

  constructor(private readonly dailyReportService: DailyReportService) {}

  ngOnInit(): void {
    this.loadReports();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadReports();
  }

  clearFilters(): void {
    this.filters = {};
    this.currentPage = 1;
    this.loadReports();
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
    this.loadReports();
  }

  nextPage(): void {
    if (this.meta && this.currentPage < this.meta.totalPages) {
      this.currentPage += 1;
      this.loadReports();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
      this.loadReports();
    }
  }

  private loadReports(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.dailyReportService
      .listMyReports(this.currentPage, this.pageSize, this.filters)
      .subscribe({
        next: (result) => {
          this.reports = result.data;
          this.meta = result.meta;
          this.currentPage = result.meta.page;
          this.pageSize = result.meta.pageSize;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err instanceof Error ? err.message : 'Unable to load reports.';
          this.isLoading = false;
        },
      });
  }
}
