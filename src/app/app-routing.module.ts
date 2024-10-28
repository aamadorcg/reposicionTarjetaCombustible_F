import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReposicionTarjetaCombustibleComponent } from './components/reposicion-tarjeta-combustible/reposicion-tarjeta-combustible.component';


const routes: Routes = [
  {
    path: 'persona-fisica',
    component: ReposicionTarjetaCombustibleComponent,
    data: { tipo: 'F' }
  },
  {
    path: 'persona-moral',
    component: ReposicionTarjetaCombustibleComponent,
    data: { tipo: 'M' }
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'persona-fisica'
  },
  {
    path: '**',
    redirectTo: 'persona-fisica'
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
