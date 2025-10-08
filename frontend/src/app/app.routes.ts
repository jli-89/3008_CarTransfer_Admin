import { Routes } from '@angular/router';

import { LoginComponent } from './auth/login/login';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './auth/reset-password/reset-password';
import { authGuard } from './auth/auth.guard';

import { AdminDashboardComponent } from './admin/dashboard/admin-dashboard';
import { QuoteManagementComponent } from './admin/quote-management/quote-management';
import { LogViewerComponent } from './admin/log-viewer/log-viewer';
import { StaffManagementComponent } from './admin/staff-management/staff-management';
import { StaffActivityComponent } from './admin/staff-activity/staff-activity';
import { DailyReportListComponent } from './admin/daily-reports/daily-report-list';
import { DailyReportFormComponent } from './admin/daily-reports/daily-report-form';
import { DailyReportHistoryComponent } from './admin/daily-reports/daily-report-history';
import { TimesheetReviewComponent } from './admin/timesheet-review/timesheet-review';
import { OrderManagementComponent } from './admin/order-management/order-management';
import { TimesheetListComponent } from './admin/timesheets/timesheet-list';
import { TimesheetCreateComponent } from './admin/timesheets/timesheet-create';
import { TimesheetHistoryComponent } from './admin/timesheets/timesheet-history';

import { StaffDashboardComponent } from './staff/dashboard/staff-dashboard';
import { EnquiriesComponent } from './staff/enquiries/enquiries';
import { QuotesBookingsComponent } from './staff/quotes-bookings/quotes-bookings';
import { CustomerEnquiriesComponent } from './staff/customer-enquiries/customer-enquiries';
import { StaffTimesheetComponent } from './staff/timesheet/staff-timesheet';
import { WorkHistoryComponent } from './staff/work-history/work-history';
import { StaffReportComponent } from './staff/report/staff-report';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [authGuard] },
  { path: 'admin/staff-management', component: StaffManagementComponent, canActivate: [authGuard] },
  { path: 'admin/order-management', component: OrderManagementComponent, canActivate: [authGuard] },
  { path: 'admin/quote-management', component: QuoteManagementComponent, canActivate: [authGuard] },
  { path: 'admin/log-viewer', component: LogViewerComponent, canActivate: [authGuard] },
  { path: 'admin/timesheets', component: TimesheetListComponent, canActivate: [authGuard] },
  { path: 'admin/timesheets/new', component: TimesheetCreateComponent, canActivate: [authGuard] },
  { path: 'admin/my-timesheets', component: TimesheetHistoryComponent, canActivate: [authGuard] },
  { path: 'admin/work-history', component: WorkHistoryComponent, canActivate: [authGuard] },
  { path: 'admin/daily-reports', component: DailyReportListComponent, canActivate: [authGuard] },
  { path: 'admin/daily-reports/new', component: DailyReportFormComponent, canActivate: [authGuard] },
  { path: 'admin/my-daily-reports', component: DailyReportHistoryComponent, canActivate: [authGuard] },
  { path: 'admin/staff-activity', component: StaffActivityComponent, canActivate: [authGuard] },
  { path: 'admin/timesheet-review', component: TimesheetReviewComponent, canActivate: [authGuard] },

  { path: 'staff/dashboard', component: StaffDashboardComponent, canActivate: [authGuard] },
  { path: 'staff/enquiries', component: EnquiriesComponent, canActivate: [authGuard] },
  { path: 'staff/quotes-bookings', component: QuotesBookingsComponent, canActivate: [authGuard] },
  { path: 'staff/customer-enquiries', component: CustomerEnquiriesComponent, canActivate: [authGuard] },
  { path: 'staff/timesheet', component: StaffTimesheetComponent, canActivate: [authGuard] },
  { path: 'staff/work-history', component: WorkHistoryComponent, canActivate: [authGuard] },
  { path: 'staff/report', component: StaffReportComponent, canActivate: [authGuard] },

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
