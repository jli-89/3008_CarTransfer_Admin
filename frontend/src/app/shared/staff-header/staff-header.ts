import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-staff-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './staff-header.html',
  styleUrls: ['./staff-header.css'],
})
export class StaffHeaderComponent {
  @Input() title = '';
}
