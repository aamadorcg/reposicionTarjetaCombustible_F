import { HttpClient, HttpParams } from "@angular/common/http";
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

  private apiUrlFinanzas: string;
  private apiUrlSmyt: string;
  public configuracion: any = [];
  constructor(private readonly http: HttpClient, private readonly alerta: AlertaUtility) {
    this.apiUrlFinanzas = environment.apiUrlFinanzas;
    this.apiUrlSmyt = environment.apiUrlSmyt;
  }

  obtenerDatosFormulario(url: string, body: any) {
    return this.http.post(`${this.apiUrlSmyt + url}`, body);
  }

  cargarConfiguracionTramite(idTramite: string): Observable<any> {
    let json = {
      strCodigo: idTramite
    };
    return this.http.post<RespuestaGenerica>(`${this.apiUrlFinanzas + '/tiposTramites/obtenerConfiguracionTramite'}`, json)
      .pipe(
        map((res) => {
          if (res.bolStatus) {
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
    return this.http.post(`${this.apiUrlFinanzas}/tramites/obtenerDocumentacion`, body);
  }

  registrarTramite(body: any) {
    return this.http.post<RespuestaGenerica>(`${this.apiUrlFinanzas}/tramites/registrarTramite`, body);
  }

  obtenerTramiteParaCorregir(idTramite: string) {
    let params = new HttpParams().set('intIdTramite', idTramite);
    return this.http.get<RespuestaGenerica>(`${this.apiUrlFinanzas}/tramites/obtenerTramite`, { params });
  }

  corregirTramite(body: any) {
    return this.http.post(`${this.apiUrlFinanzas}/documentos/actualizarDocumento`, body);
  }

  registrarTramiteSmyt(body: any) {
    return this.http.post<RespuestaGenerica>(`${this.apiUrlSmyt}/tramites/registrarReposicionTarjeta`, body);
  }
}
