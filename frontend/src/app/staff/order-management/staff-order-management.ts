import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StaffHeaderComponent } from '../../shared/staff-header/staff-header';

@Component({
  selector: 'app-staff-order-management',
  standalone: true,
  imports: [CommonModule, RouterModule, StaffHeaderComponent],
  templateUrl: './staff-order-management.html',
  styleUrls: ['./staff-order-management.css'],
})
export class StaffOrderManagementComponent {}
