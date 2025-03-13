import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { PersonaFisicaComponent } from './components/persona-fisica/persona-fisica.component';
import { PersonaMoralComponent } from './components/persona-moral/persona-moral.component';


const routes: Routes = [
  {
    path: 'persona-fisica',
    component: PersonaFisicaComponent
  },
  {
    path: 'persona-moral',
    component: PersonaMoralComponent
  },
  {
    path: 'persona-fisica/modificar/:id',
    component: PersonaFisicaComponent,
    data: { modo: 'modificar' }
  },
  {
    path: 'persona-moral/modificar/:id',
    component: PersonaMoralComponent,
    data: { modo: 'modificar' }
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
