import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, map, catchError, throwError } from "rxjs";
import { RespuestaGenerica } from "../core/models/respuesta.generica.model";
import { COLOR_CONFIRMAR } from "../shared/constants/colores";
import { AlertaUtility } from "../shared/utilities/alerta";
import { environment } from "../environments/environment";


@Injectable({
  providedIn: 'root'
})
export class ReposicionTarjetaService {

  private apiUrl: string;
  public configuracion: any = [];
  constructor(private http: HttpClient, private alerta: AlertaUtility) {
    this.apiUrl = environment.apiUrl;
  }

  obtenerDatosFormulario(url: string, body: any) {
    return this.http.post(`${this.apiUrl + url}`, body);
  }

  cargarConfiguracionTramite(idTramite: string): Observable<any> {
    let json = {
      strCodigo: idTramite
    };
    return this.http.post<RespuestaGenerica>(`${this.apiUrl + '/tiposTramites/obtenerConfiguracionTramite'}`, json)
      .pipe(
        map((res) => {
          if (res.status) {
            return res.data;
          } else {
            throw new Error('Error al obtener la configuración');
          }
        }),
        catchError((error) => {
          this.alerta.mostrarAlerta({
            message: "Ha ocurrido un error al obtener la configuración del trámite",
            icon: 'error',
            showConfirmButton: true,
            confirmButtonColor: COLOR_CONFIRMAR,
            showCloseButton: false
          });
          return throwError(() => error);
        })
      );
  }

  obtenerDocumentosTramite(body: any) {
    return this.http.post(`${this.apiUrl}/tramites/obtenerDocumentacion`, body);
  }


  registrarTramite(body: any) {
    return this.http.post(`${this.apiUrl}/tramites/registrarTramite`, body);
  }
}
