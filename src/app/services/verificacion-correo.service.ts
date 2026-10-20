import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/app/environments/environment';

export type TipoPersona = 'fisica' | 'moral';
export interface VerificacionSesion { token: string; correo: string; tipo: TipoPersona; }
interface SolicitudRespuesta { solicitudId: string; expiraEn: string; }

@Injectable({ providedIn: 'root' })
export class VerificacionCorreoService {
     private readonly base = `${environment.apiUrlFinanzas}/api/verificacion-correo`;
     private readonly key = 'reposiciontarjetacombustible.verificacion';
     constructor(private http: HttpClient) { }
     solicitar(correo: string, tipo: TipoPersona): Observable<SolicitudRespuesta> {
          return this.http.post<SolicitudRespuesta>(`${this.base}/solicitar`, { correo, tipo });
     }
     validar(solicitudId: string, codigo: string): Observable<VerificacionSesion> {
          return this.http.post<VerificacionSesion>(`${this.base}/validar`, { solicitudId, codigo }).pipe(
               tap(s => sessionStorage.setItem(this.key, JSON.stringify(s)))
          );
     }
     actual(): VerificacionSesion | null {
          try {
               const raw = sessionStorage.getItem(this.key);
               const s = raw ? JSON.parse(raw) as VerificacionSesion : null;
               return s && s.token && s.correo && (s.tipo === 'fisica' || s.tipo === 'moral') ? s : null;
          } catch { return null; }
     }
     estado(): Observable<{ valido: boolean; correo: string; tipo: TipoPersona }> {
          const s = this.actual();
          return this.http.get<{ valido: boolean; correo: string; tipo: TipoPersona }>(`${this.base}/estado`, {
               headers: new HttpHeaders({ 'X-Verificacion-Token': s?.token ?? '' })
          });
     }
     limpiar(): void { sessionStorage.removeItem(this.key); }
     terminarTramite(): void { this.limpiar(); }
}