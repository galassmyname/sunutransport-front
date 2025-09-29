import { AddUserComponent } from './pages/add-user/add-user.component';
import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { BusComponent } from './pages/bus/bus.component';
import { ArretComponent } from './pages/arret/arret.component';
import { LocalisationComponent } from './pages/localisation/localisation.component';
import { UtilisateurComponent } from './pages/utilisateur/utilisateur.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'admin',
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'bus', component: BusComponent },
      { path: 'localisation', component: LocalisationComponent },
      { path: 'arret', component: ArretComponent },
      { path: 'utilisateurs', component: UtilisateurComponent },
      { path: 'add-user', component: AddUserComponent }
    ]
  },
  { path: '', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'admin/dashboard' }
];
