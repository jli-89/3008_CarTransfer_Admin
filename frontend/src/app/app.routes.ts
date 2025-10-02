// import { Routes } from '@angular/router';
// import { QuoteBooking } from './quote-booking/quote-booking';
// import { TermsAndConditionsComponent } from './terms-and-conditions/terms-and-conditions';
// import { SearchComponent } from './search/search';
// import { DriverTracker } from './driver-tracker/driver-tracker';
// import { CustomerTracker } from './customer-tracker/customer-tracker';
// import { Contact } from './contact/contact';
// import { LoginComponent } from './auth/login/login';

// export const routes: Routes = [
//   { path: 'track/driver', component: DriverTracker },
//   { path: 'track/customer', component: CustomerTracker },
//   { path: 'quote', component: QuoteBooking },
//   { path: 'terms', component: TermsAndConditionsComponent },
//   { path: 'search', component: SearchComponent },
//   { path: 'login', component: LoginComponent }, // Ensure the path is 'login'
//   // { path: '', redirectTo: '/login', pathMatch: 'full' },
//   { path: 'contact', component: Contact },
// ];

// import { Routes } from '@angular/router';
// import { QuoteBooking } from './quote-booking/quote-booking';
// import { TermsAndConditionsComponent } from './terms-and-conditions/terms-and-conditions';
// import { SearchComponent } from './search/search';
// import { DriverTracker } from './driver-tracker/driver-tracker';
// import { CustomerTracker } from './customer-tracker/customer-tracker';
// import { Contact } from './contact/contact';
// import { LoginComponent } from './auth/login/login';

// import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password';
// import { ResetPasswordComponent } from './auth/reset-password/reset-password';
// import { StaffDashboardComponent } from './staff/dashboard/staff-dashboard';
// import { AdminDashboardComponent } from './admin/dashboard/admin-dashboard';
// import { EnquiriesComponent } from './staff/enquiries/enquiries';
// import { QuotesBookingsComponent } from './staff/quotes-bookings/quotes-bookings';
// import { CustomerEnquiriesComponent } from './staff/customer-enquiries/customer-enquiries';

// // ✅ New Admin Pages
// import { StaffManagementComponent } from './admin/staff-management/staff-management';
// import { StaffActivityComponent } from './admin/staff-activity/staff-activity';
// import { TimesheetReviewComponent } from './admin/timesheet-review/timesheet-review';

// // ✅ New Staff Page
// import { StaffTimesheetComponent } from './staff/timesheet/staff-timesheet';

// // ✅ Export routes so TS2459 is fixed
// export const routes: Routes = [
//   { path: 'track/driver', component: DriverTracker },
//   { path: 'track/customer', component: CustomerTracker },
//   { path: 'login', component: LoginComponent },
//   { path: 'forgot-password', component: ForgotPasswordComponent },

//   // 🔹 Admin
//   { path: 'admin/dashboard', component: AdminDashboardComponent },
//   { path: 'admin/staff-management', component: StaffManagementComponent },
//   { path: 'admin/staff-activity', component: StaffActivityComponent },
//   { path: 'admin/timesheet-review', component: TimesheetReviewComponent },

//   // 🔹 Staff
//   { path: 'staff/dashboard', component: StaffDashboardComponent },
//   { path: 'staff/enquiries', component: EnquiriesComponent },
//   { path: 'staff/quotes-bookings', component: QuotesBookingsComponent },
//   { path: 'staff/customer-enquiries', component: CustomerEnquiriesComponent },
//   { path: 'staff/timesheet', component: StaffTimesheetComponent },

//   // 🔹 General
//   { path: 'quote', component: QuoteBooking },
//   { path: 'terms', component: TermsAndConditionsComponent },
//   { path: 'search', component: SearchComponent },
//   { path: 'contact', component: Contact },
//   { path: 'login', component: LoginComponent },
//   // { path: 'register', component: RegistrationComponent },
//   // { path: 'forgot-password', component: ForgotPasswordComponent },
//   { path: 'reset-password', component: ResetPasswordComponent }, 
  // ✅ Keep your original default redirect (unchanged)
 // { path: '', redirectTo: '/login', pathMatch: 'full' }
// ];





// import { Routes } from '@angular/router';
// import { QuoteBooking } from './quote-booking/quote-booking';
// import { TermsAndConditionsComponent } from './terms-and-conditions/terms-and-conditions';
// import { SearchComponent } from './search/search';
// import { DriverTracker } from './driver-tracker/driver-tracker';
// import { CustomerTracker } from './customer-tracker/customer-tracker';
// import { Contact } from './contact/contact';
// import { LoginComponent } from './auth/login/login';
// import { RegistrationComponent } from './auth/registration/registration'; // Import the new component
// import { ForgotPasswordComponent } from './auth/registration/forgot-password'; // New import
// import { StaffDashboardComponent } from './staff/dashboard/staff-dashboard'; // <-- NEW IMPORT
// import { AdminDashboardComponent } from './admin/dashboard/admin-dashboard'; // <-- NEW IMPORT
// import { EnquiriesComponent } from './staff/enquiries/enquiries';



// export const routes: Routes = [
//   { path: 'track/driver', component: DriverTracker },
//    // Admin Dashboard Route
//   { path: 'admin/dashboard', component: AdminDashboardComponent }, // <-- NEW ROUTE

//   { path: 'track/customer', component: CustomerTracker },
//   { path: 'quote', component: QuoteBooking },
//    { path: 'staff/enquiries', component: EnquiriesComponent },
//   { path: 'terms', component: TermsAndConditionsComponent },
//   { path: 'search', component: SearchComponent },
//   { path: 'forgot-password', component: ForgotPasswordComponent }, // New route
//   { path: 'login', component: LoginComponent },
//   { path: 'register', component: RegistrationComponent }, // Add this route
//   // { path: '', redirectTo: '/login', pathMatch: 'full' },
//   { path: 'contact', component: Contact },
//    // Staff Dashboard Route
//   { path: 'staff/dashboard', component: StaffDashboardComponent }, // <-- NEW ROUTE
// ];


import { Routes } from '@angular/router';
import { QuoteBooking } from './quote-booking/quote-booking';
import { TermsAndConditionsComponent } from './terms-and-conditions/terms-and-conditions';
import { SearchComponent } from './search/search';
import { DriverTracker } from './driver-tracker/driver-tracker';
import { CustomerTracker } from './customer-tracker/customer-tracker';
import { Contact } from './contact/contact';
import { WorkHistoryComponent } from './staff/work-history/work-history';

// Auth
import { LoginComponent } from './auth/login/login';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './auth/reset-password/reset-password';

// Admin
import { AdminDashboardComponent } from './admin/dashboard/admin-dashboard';
import { StaffManagementComponent } from './admin/staff-management/staff-management';
import { StaffActivityComponent } from './admin/staff-activity/staff-activity';
import { TimesheetReviewComponent } from './admin/timesheet-review/timesheet-review';

// Staff
import { StaffDashboardComponent } from './staff/dashboard/staff-dashboard';
import { EnquiriesComponent } from './staff/enquiries/enquiries';
import { QuotesBookingsComponent } from './staff/quotes-bookings/quotes-bookings';
import { CustomerEnquiriesComponent } from './staff/customer-enquiries/customer-enquiries';
import { StaffTimesheetComponent } from './staff/timesheet/staff-timesheet';
import { StaffReportComponent } from './staff/report/staff-report';
export const routes: Routes = [
  // General
  { path: 'track/driver', component: DriverTracker },
  { path: 'track/customer', component: CustomerTracker },
  { path: 'quote', component: QuoteBooking },
  { path: 'terms', component: TermsAndConditionsComponent },
  { path: 'search', component: SearchComponent },
  { path: 'contact', component: Contact },
  { path: 'staff/work-history', component: WorkHistoryComponent },
  { path: 'staff/report', component: StaffReportComponent },
  // Auth
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  // Admin
  { path: 'admin/dashboard', component: AdminDashboardComponent },
  { path: 'admin/staff-management', component: StaffManagementComponent },
  { path: 'admin/staff-activity', component: StaffActivityComponent },
  { path: 'admin/timesheet-review', component: TimesheetReviewComponent },

  // Staff
  { path: 'staff/dashboard', component: StaffDashboardComponent },
  { path: 'staff/enquiries', component: EnquiriesComponent },
  { path: 'staff/quotes-bookings', component: QuotesBookingsComponent },
  { path: 'staff/customer-enquiries', component: CustomerEnquiriesComponent },
  { path: 'staff/timesheet', component: StaffTimesheetComponent },

  // Default
  //{ path: '', redirectTo: '/login', pathMatch: 'full' }
];
