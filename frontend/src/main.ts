// import { bootstrapApplication } from '@angular/platform-browser';
// import { appConfig } from './app/app.config';
// import { App } from './app/app'; // This import is now correct

// bootstrapApplication(App, appConfig)
//   .catch((err) => console.error(err));
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config'; // Or wherever app.config.ts is located
import { App } from './app/app'; // Or wherever your App component is located

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));