import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { PersonaFisicaComponent } from './components/persona-fisica/persona-fisica.component';
import { PersonaMoralComponent } from './components/persona-moral/persona-moral.component';
import { VersionComponent } from './components/version/version.component';
import { VerificacionCorreoComponent } from './components/verificacion-correo/verificacion-correo.component';
import { VerificacionCorreoGuard } from './core/guards/verificacion-correo.guard';


const routes: Routes = [
  { path: 'verificar-correo/:tipo', component: VerificacionCorreoComponent },
  {
    path: 'persona-fisica',
    component: PersonaFisicaComponent,
    canActivate: [VerificacionCorreoGuard]
  },
  {
    path: 'persona-moral',
    component: PersonaMoralComponent,
    canActivate: [VerificacionCorreoGuard]
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
    redirectTo: 'verificar-correo/fisica'
  },
  { path: 'version', component: VersionComponent },
  {
    path: 'not-found',
    component: NotFoundComponent,
  },
  {
    path: '**',
    redirectTo: 'verificar-correo/fisica'
  },
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
