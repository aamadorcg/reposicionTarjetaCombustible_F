import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReposicionTarjetaCombustibleComponent } from './components/reposicion-tarjeta-combustible/reposicion-tarjeta-combustible.component';
import { NotFoundComponent } from './components/not-found/not-found.component';


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
    path: 'persona-fisica/modificar/:id',
    component: ReposicionTarjetaCombustibleComponent,
    data: { tipo: 'F', modo: 'modificar' }
  },
  {
    path: 'persona-moral/modificar/:id',
    component: ReposicionTarjetaCombustibleComponent,
    data: { tipo: 'M', modo: 'modificar' }
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'persona-fisica'
  },
  {
    path: 'not-found',
    component: NotFoundComponent,
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
