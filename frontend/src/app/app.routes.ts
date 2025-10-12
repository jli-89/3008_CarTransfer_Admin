import { Routes } from '@angular/router';

// === AUTH ===
import { LoginComponent } from './auth/login/login';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './auth/reset-password/reset-password';
import { authGuard } from './auth/auth.guard';

// === ADMIN ===
import { AdminDashboardComponent } from './admin/dashboard/admin-dashboard';
import { StaffActivityComponent } from './admin/staff-activity/staff-activity';
import { StaffManagementComponent } from './admin/staff-management/staff-management';
import { OrderManagementComponent } from './admin/order-management/order-management';
import { QuoteManagementComponent } from './admin/quote-management/quote-management';
import { LogViewerComponent } from './admin/log-viewer/log-viewer';
import { TimesheetReviewComponent } from './admin/timesheet-review/timesheet-review';

// Admin - Daily Reports
import { DailyReportListComponent } from './admin/daily-reports/daily-report-list';
import { DailyReportFormComponent } from './admin/daily-reports/daily-report-form';
import { DailyReportHistoryComponent } from './admin/daily-reports/daily-report-history';
import { DailyReportMyComponent } from './admin/daily-reports/daily-report-my';

// Admin - Timesheets
import { TimesheetListComponent } from './admin/timesheets/timesheet-list';
import { TimesheetCreateComponent } from './admin/timesheets/timesheet-create';
import { TimesheetHistoryComponent } from './admin/timesheets/timesheet-history';

// === STAFF ===
import { StaffDashboardComponent } from './staff/dashboard/staff-dashboard';
import { StaffSelfManagementComponent } from './staff/staff-management/staff-self-management';
import { StaffOrderManagementComponent } from './staff/order-management/staff-order-management';
import { StaffReportComponent } from './staff/report/staff-report';
import { StaffTimesheetComponent } from './staff/timesheet/staff-timesheet';
import { WorkHistoryComponent } from './staff/work-history/work-history';
import { EnquiriesComponent } from './staff/enquiries/enquiries';
import { QuotesBookingsComponent } from './staff/quotes-bookings/quotes-bookings';
import { CustomerEnquiriesComponent } from './staff/customer-enquiries/customer-enquiries';


// =======================================
// 🌐 ROUTE CONFIGURATION STARTS HERE
// =======================================

export const routes: Routes = [

  // === AUTHENTICATION ROUTES ===
  { path: 'login', component: LoginComponent },
  // 忘記密碼與重設密碼功能（後端暫未開啟）
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },


  // === ADMIN DASHBOARD & MANAGEMENT ===
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [authGuard] },
  { path: 'admin/staff-management', component: StaffManagementComponent, canActivate: [authGuard] },
  { path: 'admin/order-management', component: OrderManagementComponent, canActivate: [authGuard] },
  { path: 'admin/quote-management', component: QuoteManagementComponent, canActivate: [authGuard] },
  { path: 'admin/staff-activity', component: StaffActivityComponent, canActivate: [authGuard] },
  { path: 'admin/log-viewer', component: LogViewerComponent, canActivate: [authGuard] },
  { path: 'admin/work-history', component: WorkHistoryComponent, canActivate: [authGuard] },


  // === ADMIN TIMESHEETS ===
  { path: 'admin/timesheets', component: TimesheetListComponent, canActivate: [authGuard] },
  { path: 'admin/timesheets/new', component: TimesheetCreateComponent, canActivate: [authGuard] },
  { path: 'admin/my-timesheets', component: TimesheetHistoryComponent, canActivate: [authGuard] },
  { path: 'admin/timesheet-review', component: TimesheetReviewComponent, canActivate: [authGuard] },


  // === ADMIN DAILY REPORTS ===
  { path: 'admin/daily-reports', component: DailyReportListComponent, canActivate: [authGuard] },
  { path: 'admin/daily-reports/new', component: DailyReportFormComponent, canActivate: [authGuard] },
  { path: 'admin/my-daily-reports', component: DailyReportHistoryComponent, canActivate: [authGuard] },    // 舊版
  { path: 'admin/my-daily-reports-v2', component: DailyReportMyComponent, canActivate: [authGuard] },       // 新版


  // === STAFF DASHBOARD ===
  { path: 'staff/dashboard', component: StaffDashboardComponent, canActivate: [authGuard] },

  // === STAFF MANAGEMENT & MODULES ===
  { path: 'staff/staff-management', component: StaffSelfManagementComponent, canActivate: [authGuard] },
{ path: 'staff/order-management', component: OrderManagementComponent, canActivate: [authGuard] },
  { path: 'staff/report', component: StaffReportComponent, canActivate: [authGuard] },
  { path: 'staff/timesheet', component: StaffTimesheetComponent, canActivate: [authGuard] },
  { path: 'staff/work-history', component: WorkHistoryComponent, canActivate: [authGuard] },

  // === STAFF ENQUIRIES & BOOKINGS ===
  { path: 'staff/enquiries', component: EnquiriesComponent, canActivate: [authGuard] },
  { path: 'staff/quotes-bookings', component: QuotesBookingsComponent, canActivate: [authGuard] },
  { path: 'staff/customer-enquiries', component: CustomerEnquiriesComponent, canActivate: [authGuard] },

  // === STAFF TIMESHEETS & REPORTS ===
  { path: 'staff/timesheets/new', component: TimesheetCreateComponent, canActivate: [authGuard] },
  { path: 'staff/my-timesheets', component: TimesheetHistoryComponent, canActivate: [authGuard] },
  { path: 'staff/daily-reports/new', component: DailyReportFormComponent, canActivate: [authGuard] },
  //{ path: 'staff/my-daily-reports', component: DailyReportHistoryComponent, canActivate: [authGuard] },
  { path: 'staff/my-daily-reports', component: DailyReportMyComponent, canActivate: [authGuard] },


  // === DEFAULT & FALLBACK ===
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

