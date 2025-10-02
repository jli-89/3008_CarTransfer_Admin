import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  identifier: string = ''; // username or email
  error: string | null = null;
  message: string | null = null;

  submitRequest() {
    this.error = null;
    this.message = null;

    if (!this.identifier.trim()) {
      this.error = 'Please enter your username or email.';
      return;
    }

    // 🔹 Ready for backend integration
    // Example (to be added later):
    // this.http.post('/api/auth/forgot-password', { identifier: this.identifier })
    //   .subscribe({
    //     next: () => this.message = 'If this account exists, a reset link has been sent to the registered email.',
    //     error: () => this.error = 'Something went wrong. Please try again later.'
    //   });

    // For now, just show success placeholder
    this.message = 'If this account exists, a reset link will be sent to the registered email.';
  }
}
