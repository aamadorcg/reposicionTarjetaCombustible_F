import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReposicionTarjetaCombustibleComponent } from './components/reposicion-tarjeta-combustible/reposicion-tarjeta-combustible.component';


const routes: Routes = [
  {
    path: 'reposicion-tarjeta-combustible-fisica',
    component: ReposicionTarjetaCombustibleComponent,
    data: {tipo: 'F'}
  },
  {
    path: 'reposicion-tarjeta-combustible-moral',
    component: ReposicionTarjetaCombustibleComponent,
    data: {tipo: 'M'}
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'reposicion-tarjeta-combustible-fisica'
  },
  {
    path: '**',
    redirectTo: 'reposicion-tarjeta-combustible-fisica'
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
