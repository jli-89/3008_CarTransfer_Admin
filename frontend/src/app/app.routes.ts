import { Routes } from '@angular/router';

import { LoginComponent } from './auth/login/login';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './auth/reset-password/reset-password';
import { authGuard } from './auth/auth.guard';

import { AdminDashboardComponent } from './admin/dashboard/admin-dashboard';
import { StaffManagementComponent } from './admin/staff-management/staff-management';
import { StaffActivityComponent } from './admin/staff-activity/staff-activity';
import { TimesheetReviewComponent } from './admin/timesheet-review/timesheet-review';
import { OrderManagementComponent } from './admin/order-management/order-management';

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
