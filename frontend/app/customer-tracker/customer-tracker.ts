// import { Component, OnInit, OnDestroy } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { HttpClient, HttpClientModule } from '@angular/common/http';
// import * as L from 'leaflet';
// import { Subscription, interval } from 'rxjs';
// Add the 'export' keyword here
export class CustomerTracker {
    
  // Your component code goes here
}

// @Component({
//   selector: 'app-customer-tracker',
//   standalone: true,
//   imports: [CommonModule, HttpClientModule],
//   template: `
//     <div class="tracker-container">
//       <h2>Live Vehicle Tracker</h2>
//       <p>This map shows the latest known location of the vehicle.</p>
//       <div id="map" class="map-container"></div>
//     </div>
//   `,
//   styleUrls: ['./customer-tracker.css']
// })
// export class CustomerTracker implements OnInit, OnDestroy {
//   private map: L.Map | undefined;
//   private marker: L.Marker | undefined;
//   private pollingSubscription: Subscription | undefined;
//   private readonly apiUrl = 'http://localhost:3000/api/location';

//   constructor(private http: HttpClient) { }

//   ngOnInit(): void {
//     this.initMap();
//     this.startPollingLocation();
//   }

//   ngOnDestroy(): void {
//     this.map?.remove();
//     this.pollingSubscription?.unsubscribe();
//   }

//   private initMap(): void {
//     if (this.map) { return; }
    
//     setTimeout(() => {
//         const mapElement = document.getElementById('map');
//         if (mapElement) {
//           this.map = L.map('map').setView([-37.8136, 144.9631], 13);
//           L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//               attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//           }).addTo(this.map);
          
//           this.map.invalidateSize(); 
//         }
//     }, 100);
//   }

//   private startPollingLocation(): void {
//     const twentySeconds = 20000;
//     this.pollingSubscription = interval(twentySeconds).subscribe(() => {
//       this.fetchLocation();
//     });
//     this.fetchLocation();
//   }

//   private fetchLocation(): void {
//     this.http.get<{ lat: number, lng: number }>(this.apiUrl).subscribe({
//       next: (location) => {
//         if (this.map && location) {
//           const newLatLng = new L.LatLng(location.lat, location.lng);
//           if (!this.marker) {
//             this.marker = L.marker(newLatLng).addTo(this.map).bindPopup('Vehicle Location').openPopup();
//           } else {
//             this.marker.setLatLng(newLatLng);
//           }
//           this.map.panTo(newLatLng);
//         }
//       },
//       error: (err) => {
//         console.error('Error fetching location:', err);
//       }
//     });
//   }
// }