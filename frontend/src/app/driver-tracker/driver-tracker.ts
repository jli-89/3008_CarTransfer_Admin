// import { Component, OnInit, OnDestroy } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { HttpClient, HttpClientModule } from '@angular/common/http';
// import * as L from 'leaflet';

// Add the 'export' keyword here
export class DriverTracker {
  // Your component code goes here
}
// @Component({
//   selector: 'app-driver-tracker',
//   standalone: true,
//   imports: [CommonModule, HttpClientModule],
//   template: `
//     <div class="driver-container">
//       <h2>Driver Panel</h2>
//       <p>This is your current location. Click the button to send it to the customer.</p>
//       <div id="driver-map" class="map-container"></div>
//       <button (click)="sendCurrentLocation()">Send My Location</button>
//       <p *ngIf="statusMessage">{{ statusMessage }}</p>
//     </div>
//   `,
//   styleUrls: ['./driver-tracker.css']
// })
// export class DriverTracker implements OnInit, OnDestroy {
//   private map: L.Map | undefined;
//   private marker: L.Marker | undefined;
//   private watchId: number | undefined;
//   statusMessage: string = '';

//   constructor(private http: HttpClient) { }

//   ngOnInit(): void {
//     this.initMap();
//     this.startTracking();
//   }

//   ngOnDestroy(): void {
//     if (this.watchId) {
//       navigator.geolocation.clearWatch(this.watchId);
//     }
//     this.map?.remove();
//   }

//   private initMap(): void {
//     if (this.map) { return; }

//     setTimeout(() => {
//         const mapElement = document.getElementById('driver-map');
//         if (mapElement) {
//             this.map = L.map('driver-map').setView([-37.8136, 144.9631], 13);
//             L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//                 attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//             }).addTo(this.map);

//             this.map.invalidateSize();
//         }
//     }, 100);
//   }

//   private startTracking(): void {
//     if (!navigator.geolocation) {
//       this.statusMessage = 'Geolocation is not supported by your browser.';
//       return;
//     }

//     this.watchId = navigator.geolocation.watchPosition(
//       (position) => {
//         const lat = position.coords.latitude;
//         const lng = position.coords.longitude;
//         const newLatLng = new L.LatLng(lat, lng);
//         if (!this.marker) {
//           this.marker = L.marker(newLatLng).addTo(this.map!).bindPopup('My Location').openPopup();
//         } else {
//           this.marker.setLatLng(newLatLng);
//         }
//         this.map!.panTo(newLatLng);
//         this.statusMessage = `Location updated at ${new Date().toLocaleTimeString()}`;
//       },
//       (error) => {
//         this.statusMessage = `Error getting location: ${error.message}`;
//         console.error(error);
//       },
//       {
//         enableHighAccuracy: true
//       }
//     );
//   }

//   sendCurrentLocation(): void {
//     if (!this.marker) {
//       this.statusMessage = 'Waiting for location data...';
//       return;
//     }

//     const locationData = {
//       lat: this.marker.getLatLng().lat,
//       lng: this.marker.getLatLng().lng
//     };

//     this.http.post('http://localhost:3000/api/location', locationData).subscribe({
//       next: () => {
//         this.statusMessage = 'Location sent successfully!';
//       },
//       error: (err) => {
//         this.statusMessage = 'Error sending location.';
//         console.error(err);
//       }
//     });
//   }
// }