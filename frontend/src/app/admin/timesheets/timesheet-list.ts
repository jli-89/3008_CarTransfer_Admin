import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import {
  SignTimesheetPayload,
  StaffOption,
  TimesheetDetail,
  TimesheetListMeta,
  TimesheetManagementService,
  TimesheetQuery,
  TimesheetStatus,
  TimesheetSummary,
} from './timesheet-management.service';

class SignaturePadController {
  private ctx: CanvasRenderingContext2D | null = null;
  private drawing = false;
  private hasStroke = false;
  private listeners: Array<() => void> = [];
  private pixelRatio = 1;

  constructor(private readonly canvasRef: ElementRef<HTMLCanvasElement>) {}

  init() {
    const canvas = this.canvasRef.nativeElement;
    canvas.style.touchAction = 'none';
    this.configureCanvas();

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }
      if (!this.ctx) {
        return;
      }
      this.drawing = true;
      this.hasStroke = true;
      canvas.setPointerCapture(event.pointerId);
      this.ctx.beginPath();
      const pos = this.getPosition(event);
      this.ctx.moveTo(pos.x, pos.y);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!this.drawing || !this.ctx) {
        return;
      }
      event.preventDefault();
      const pos = this.getPosition(event);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
    };

    const stopDrawing = (event: PointerEvent) => {
      if (!this.drawing || !this.ctx) {
        return;
      }
      this.drawing = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      this.ctx.beginPath();
    };

    const handleResize = () => {
      const snapshot = this.hasStroke ? canvas.toDataURL() : null;
      this.configureCanvas();
      if (snapshot && this.ctx && typeof Image !== 'undefined') {
        const image = new Image();
        image.onload = () => {
          this.ctx!.drawImage(
            image,
            0,
            0,
            canvas.width / this.pixelRatio,
            canvas.height / this.pixelRatio
          );
        };
        image.src = snapshot;
      }
    };

    const win = typeof window !== 'undefined' ? window : null;

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointerleave', stopDrawing);
    if (win) {
      win.addEventListener('resize', handleResize);
    }

    this.listeners = [
      () => canvas.removeEventListener('pointerdown', handlePointerDown),
      () => canvas.removeEventListener('pointermove', handlePointerMove),
      () => canvas.removeEventListener('pointerup', stopDrawing),
      () => canvas.removeEventListener('pointerleave', stopDrawing),
    ];
    if (win) {
      this.listeners.push(() => win.removeEventListener('resize', handleResize));
    }
  }

  destroy() {
    this.listeners.forEach((unhook) => unhook());
    this.listeners = [];
  }

  clear() {
    if (!this.ctx) {
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.restore();
    this.ctx.beginPath();
    this.hasStroke = false;
  }

  toDataUrl(): string | null {
    if (!this.hasStroke) {
      return null;
    }
    return this.canvasRef.nativeElement.toDataURL('image/png');
  }

  private configureCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const ratio = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    this.pixelRatio = ratio;
    canvas.width = Math.max(Math.floor(rect.width * ratio), 1);
    canvas.height = Math.max(Math.floor(rect.height * ratio), 1);
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Unable to initialise signature pad');
    }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(ratio, ratio);
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#000000';
  }

  private getPosition(event: PointerEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left),
      y: (event.clientY - rect.top),
    };
  }
}

@Component({
  selector: 'app-timesheet-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './timesheet-list.html',
  styleUrls: ['./timesheet-list.css'],
})
export class TimesheetListComponent implements OnInit, OnDestroy {
  @ViewChild('managerSignCanvas')
  set managerSignCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    if (ref) {
      this.managerPad?.destroy();
      this.managerPad = new SignaturePadController(ref);
      this.managerPad.init();
    }
  }

  filters: TimesheetQuery = {};
  staffOptions: StaffOption[] = [];
  statuses: TimesheetStatus[] = ['draft', 'submitted', 'approved', 'rejected'];

  timesheets: TimesheetSummary[] = [];
  selectedTimesheet: TimesheetDetail | null = null;
  meta: TimesheetListMeta | null = null;
  currentPage = 1;
  pageSize = 20;
  showApproved = false;

  isLoadingList = false;
  isLoadingDetail = false;
  isSigning = false;
  errorMessage: string | null = null;
  detailError: string | null = null;
  signError: string | null = null;
  statusSuccessMessage: string | null = null;

  private managerPad?: SignaturePadController;

  constructor(
    private readonly timesheetService: TimesheetManagementService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadStaffOptions();
    this.fetchTimesheets();
  }

  ngOnDestroy(): void {
    this.managerPad?.destroy();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.fetchTimesheets();
  }

  clearFilters(): void {
    this.filters = {};
    this.currentPage = 1;
    this.fetchTimesheets();
  }

  navigateToDashboard(): void {
    this.router.navigate(['/admin/dashboard']);
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
    this.fetchTimesheets(false);
  }

  nextPage(): void {
    if (this.meta && this.currentPage < this.meta.totalPages) {
      this.currentPage += 1;
      this.fetchTimesheets(false);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
      this.fetchTimesheets(false);
    }
  }

  selectTimesheet(timesheet: TimesheetSummary): void {
    if (this.selectedTimesheet?.timesheet_id === timesheet.timesheet_id) {
      return;
    }
    this.loadDetail(timesheet.timesheet_id);
  }

  refreshDetail(): void {
    if (!this.selectedTimesheet) {
      return;
    }
    this.loadDetail(this.selectedTimesheet.timesheet_id);
  }

  updateStatus(status: TimesheetStatus): void {
    if (!this.selectedTimesheet) {
      return;
    }
    this.signError = null;
    this.detailError = null;
    this.statusSuccessMessage = null;
    this.isSigning = true;

    this.timesheetService
      .updateTimesheet(this.selectedTimesheet.timesheet_id, { status })
      .subscribe({
        next: (detail) => {
          this.selectedTimesheet = detail;
          this.mergeSummary(detail);
          this.statusSuccessMessage = `Status updated to ${detail.status}.`;
          this.isSigning = false;
        },
        error: (err) => {
          this.detailError = err instanceof Error ? err.message : 'Failed to update timesheet.';
          this.isSigning = false;
        }
      });
  }

  submitManagerSignature(): void {
    if (!this.selectedTimesheet || !this.managerPad) {
      return;
    }
    const dataUrl = this.managerPad.toDataUrl();
    if (!dataUrl) {
      this.signError = 'Please draw a signature before submitting.';
      return;
    }
    const payload: SignTimesheetPayload = {
      signer_role: 'manager',
      signature_data_url: dataUrl,
    };
    this.signError = null;
    this.isSigning = true;

    this.timesheetService
      .signTimesheet(this.selectedTimesheet.timesheet_id, payload)
      .subscribe({
        next: (detail) => {
          this.selectedTimesheet = detail;
          this.mergeSummary(detail);
          this.managerPad?.clear();
          this.isSigning = false;
        },
        error: (err) => {
          this.signError = err instanceof Error ? err.message : 'Failed to record signature.';
          this.isSigning = false;
        }
      });
  }

  clearManagerSignature(): void {
    this.managerPad?.clear();
    this.signError = null;
  }

  private fetchTimesheets(resetSelection: boolean = true): void {
    this.isLoadingList = true;
    this.errorMessage = null;
    this.timesheetService
      .listTimesheets(this.filters, this.currentPage, this.pageSize, this.showApproved)
      .subscribe({
        next: (result) => {
          this.timesheets = result.data;
          this.meta = result.meta;
          this.currentPage = result.meta.page;
          this.pageSize = result.meta.pageSize;
          this.isLoadingList = false;

          if (resetSelection) {
            this.selectedTimesheet = result.data.length ? null : this.selectedTimesheet;
          } else if (this.selectedTimesheet) {
            const match = result.data.find(
              (row) => row.timesheet_id === this.selectedTimesheet!.timesheet_id
            );
            if (!match) {
              this.selectedTimesheet = null;
            } else if (this.selectedTimesheet) {
              this.selectedTimesheet = {
                ...this.selectedTimesheet,
                work_date: match.work_date,
                start_time: match.start_time,
                end_time: match.end_time,
                total_minutes: match.total_minutes,
                location: match.location,
                notes: match.notes,
                status: match.status,
                approved_by_user_id: match.approved_by_user_id,
                approved_by_display_name: match.approved_by_display_name,
                approved_at: match.approved_at,
              };
              this.mergeSummary(this.selectedTimesheet);
            }
          }
        },
        error: (err) => {
          this.errorMessage = err instanceof Error ? err.message : 'Unable to load timesheets.';
          this.isLoadingList = false;
        }
      });
  }

  private loadDetail(timesheetId: number): void {
    this.isLoadingDetail = true;
    this.detailError = null;
    this.statusSuccessMessage = null;
    this.timesheetService.getTimesheet(timesheetId).subscribe({
      next: (detail) => {
        this.selectedTimesheet = detail;
        this.isLoadingDetail = false;
      },
      error: (err) => {
        this.detailError = err instanceof Error ? err.message : 'Unable to load timesheet.';
        this.selectedTimesheet = null;
        this.isLoadingDetail = false;
      }
    });
  }

  private loadStaffOptions(): void {
    this.timesheetService.listStaffOptions().subscribe({
      next: (options) => {
        this.staffOptions = options;
      },
      error: () => {
        this.staffOptions = [];
      }
    });
  }

  private mergeSummary(detail: TimesheetDetail): void {
    this.timesheets = this.timesheets.map((summary) =>
      summary.timesheet_id === detail.timesheet_id
        ? {
            ...summary,
            work_date: detail.work_date,
            status: detail.status,
            total_minutes: detail.total_minutes,
            location: detail.location,
            notes: detail.notes,
            approved_by_user_id: detail.approved_by_user_id,
            approved_by_display_name: detail.approved_by_display_name,
            approved_at: detail.approved_at,
            has_employee_signature: detail.signatures.some((sig) => sig.signer_role === 'employee'),
            has_manager_signature: detail.signatures.some((sig) => sig.signer_role === 'manager'),
          }
        : summary
    );
  }
}
