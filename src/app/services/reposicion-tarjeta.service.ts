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

/*
  Realiza una solicitud POST a la URL especificada con el cuerpo de datos proporcionado.
  Recibe dos parámetros: `url` (string) que representa la URL del endpoint y `body` (any) que es el cuerpo de la solicitud.
  Retorna la respuesta de la solicitud HTTP.
*/
  obtenerDatosFormulario(url: string, body: any) {
    return this.http.post<RespuestaGenerica>(`${this.apiUrlSmyt + url}`, body);
  }

/*
  Carga la configuración de un trámite específico utilizando el ID proporcionado.
  Recibe un parámetro `idTramite` (número) y realiza una solicitud POST al servidor para obtener la configuración del trámite.
  Retorna un observable con los datos de configuración si la respuesta es exitosa, o lanza un error si falla.
  En caso de error, muestra una alerta de error al usuario y propaga el error.
*/
  cargarConfiguracionTramite(idTramite: number): Observable<any> {
    let json = {
      intId: idTramite
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

/*
  Realiza una solicitud POST para obtener la documentación de un trámite.
  Recibe un parámetro `body` (cualquier tipo) que contiene los datos necesarios para la solicitud.
  Retorna la respuesta de la solicitud HTTP.
*/
  obtenerDocumentosTramite(body: any) {
    return this.http.post(`${this.apiUrlFinanzas}/tramites/obtenerDocumentacion`, body);
  }

/*
  Realiza una solicitud POST para registrar un trámite.
  Recibe un parámetro `body` (cualquier tipo) que contiene los datos del trámite a registrar.
  Retorna la respuesta de la solicitud HTTP, que incluye un objeto `RespuestaGenerica`.
*/
  registrarTramite(body: any) {
    return this.http.post<RespuestaGenerica>(`${this.apiUrlFinanzas}/tramites/registrarTramite`, body);
  }

/*
  Realiza una solicitud GET para obtener un trámite específico para corregirlo, utilizando el `idTramite` proporcionado.
  Recibe un parámetro `idTramite` (string) y lo pasa como un parámetro de consulta en la solicitud.
  Retorna la respuesta de la solicitud HTTP, que incluye un objeto `RespuestaGenerica`.
*/
  obtenerTramiteParaCorregir(idTramite: string) {
    let params = new HttpParams().set('intIdTramite', idTramite);
    return this.http.get<RespuestaGenerica>(`${this.apiUrlFinanzas}/tramites/obtenerTramite`, { params });
  }

/*
  Realiza una solicitud POST para corregir un trámite, enviando los datos proporcionados en el `body`.
  Recibe un parámetro `body` (cualquier tipo) que contiene la información necesaria para actualizar el trámite.
  Retorna la respuesta de la solicitud HTTP.
*/
  corregirTramite(body: any) {
    return this.http.post(`${this.apiUrlFinanzas}/documentos/actualizarDocumento`, body);
  }

/*
  Realiza una solicitud POST para registrar un trámite de reposición de tarjeta en el sistema SMYT.
  Recibe un parámetro `body` (cualquier tipo) que contiene los datos del trámite a registrar.
  Retorna la respuesta de la solicitud HTTP, que incluye un objeto `RespuestaGenerica`.
*/
  registrarTramiteSmyt(body: any) {
    return this.http.post<RespuestaGenerica>(`${this.apiUrlSmyt}/tramites/registrarReposicionTarjeta`, body);
  }
}
