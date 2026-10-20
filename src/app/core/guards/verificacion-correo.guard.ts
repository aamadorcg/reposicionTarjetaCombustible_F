import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TipoPersona, VerificacionCorreoService } from 'src/app/services/verificacion-correo.service';

@Injectable({ providedIn: 'root' })
export class VerificacionCorreoGuard implements CanActivate {
     constructor(private service: VerificacionCorreoService, private router: Router) { }
     canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
          const tipo: TipoPersona = route.routeConfig?.path === 'persona-moral' ? 'moral' : 'fisica';
          const sesion = this.service.actual();
          const redirigir = () => this.router.createUrlTree(['/verificar-correo', tipo]);
          if (!sesion || sesion.tipo !== tipo) return of(redirigir());
          return this.service.estado().pipe(
               map(r => r.valido && r.tipo === tipo && r.correo === sesion.correo ? true : redirigir()),
               catchError(() => of(redirigir()))
          );
     }
}