import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  CreateTimesheetPayload,
  SignTimesheetPayload,
  StaffOption,
  TimesheetManagementService,
} from './timesheet-management.service';

interface TimesheetFormState {
  staff_user_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
}

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
      throw new Error('Unable to initialise signature pad context');
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
  selector: 'app-timesheet-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timesheet-create.html',
  styleUrls: ['./timesheet-create.css'],
})
export class TimesheetCreateComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('employeeSigCanvas') employeeSigCanvas?: ElementRef<HTMLCanvasElement>;

  staffOptions: StaffOption[] = [];
  form: TimesheetFormState = this.createDefaultForm();

  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private employeePad?: SignaturePadController;
  constructor(
    private readonly timesheetService: TimesheetManagementService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadStaffOptions();
  }

  ngAfterViewInit(): void {
    if (this.employeeSigCanvas) {
      this.employeePad = new SignaturePadController(this.employeeSigCanvas);
      this.employeePad.init();
    }
  }

  ngOnDestroy(): void {
    this.employeePad?.destroy();
  }

  async submit(): Promise<void> {
    this.errorMessage = null;
    this.successMessage = null;

    const staffId = Number(this.form.staff_user_id);
    if (!Number.isInteger(staffId) || staffId <= 0) {
      this.errorMessage = 'Please choose a staff member.';
      return;
    }
    if (!this.form.work_date) {
      this.errorMessage = 'Work date is required.';
      return;
    }

    const payload: CreateTimesheetPayload = {
      staff_user_id: staffId,
      work_date: this.form.work_date,
      start_time: this.form.start_time || undefined,
      end_time: this.form.end_time || undefined,
      location: this.form.location.trim() ? this.form.location.trim() : undefined,
      notes: this.form.notes.trim() ? this.form.notes.trim() : undefined,
    };

    const total = this.calculateTotalMinutes(this.form.work_date, this.form.start_time, this.form.end_time);
    if (total !== null) {
      payload.total_minutes = total;
    }

    this.isLoading = true;

    try {
      const created = await firstValueFrom(this.timesheetService.createTimesheet(payload));

      const employeeDataUrl = this.employeePad?.toDataUrl();
      if (employeeDataUrl) {
        await firstValueFrom(
          this.timesheetService.signTimesheet(created.timesheet_id, {
            signer_role: 'employee',
            signature_data_url: employeeDataUrl,
          })
        );
      }

      this.successMessage = 'Timesheet created successfully.';
      this.resetForm();
      this.employeePad?.clear();
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Failed to create timesheet.';
    } finally {
      this.isLoading = false;
    }
  }

  clearEmployeeSignature(): void {
    this.employeePad?.clear();
  }

  navigateToDashboard(): void {
    const target = this.router.url.startsWith('/staff') ? '/staff/dashboard' : '/admin/dashboard';
    this.router.navigate([target]);
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

  private calculateTotalMinutes(date: string, start: string, end: string): number | null {
    if (!date || !start || !end) {
      return null;
    }
    const startDateTime = new Date(`${date}T${start}:00`);
    const endDateTime = new Date(`${date}T${end}:00`);
    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      return null;
    }
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    return Math.round(diffMs / 60000);
  }

  private createDefaultForm(): TimesheetFormState {
    return {
      staff_user_id: '',
      work_date: '',
      start_time: '',
      end_time: '',
      location: '',
      notes: '',
    };
  }

  resetForm(): void {
    this.form = this.createDefaultForm();
  }
}
