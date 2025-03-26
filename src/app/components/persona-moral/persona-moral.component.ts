import { Component, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AlertaUtility } from 'src/app/shared/utilities/alerta';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatStepper } from '@angular/material/stepper';
import { convertirPDFbase64 } from 'src/app/shared/utilities/convertirPDFbase64';
import { COLOR_CONFIRMAR, COLOR_SI } from 'src/app/shared/constants/colores';
import { TerminosCondicionesComponent } from 'src/app/components/terminos-condiciones/terminos-condiciones.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ActivatedRoute, Router } from '@angular/router';
import { ReposicionTarjetaService } from 'src/app/services/reposicion-tarjeta.service'
import { RespuestaGenerica } from 'src/app/core/models/respuesta.generica.model';
import { switchMap, retryWhen, delayWhen, timer, of, throwError, catchError, map } from 'rxjs';


type ClavesFormulario = 'datosConcesionForm' | 'datosConcesionarioForm' | 'documentosUnidadForm';

@Component({
  selector: 'app-persona-moral',
  templateUrl: './persona-moral.component.html',
  styleUrls: ['./persona-moral.component.css']
})

export class PersonaMoralComponent {

  @ViewChild(MatStepper) stepper!: MatStepper;

  FORM_DATOS_CONCESION = 'Datos de la Concesión';
  FORM_DATOS_CONCESIONARIO = 'Datos del Concesionario';
  FORM_DATOS_DOCUMENTOS = 'Documentos del Concesionario';

  descripciones: { [key: string]: string } = {
    strNiv: `El campo <strong>Número de Identificación Vehicular</strong> de <strong>${this.FORM_DATOS_CONCESION}</strong>, no debe estar vacío o el formato es no válido.`,
    strPlaca: `El campo <strong>Placa Vehícular</strong> de <strong>${this.FORM_DATOS_CONCESION}</strong>, no debe estar vacío o el formato es no válido.`,
    strRfc: `El campo <strong>RFC</strong> de <strong>${this.FORM_DATOS_CONCESIONARIO}</strong>, no debe estar vacío o el formato es no válido.`,
    strEmail: `El campo <strong>Correo</strong> de <strong>${this.FORM_DATOS_CONCESIONARIO}</strong>, no debe estar vacío o el formato es no válido.`,
    strTelefonoContacto: `El campo <strong>Teléfono Concesionario</strong> de <strong>${this.FORM_DATOS_CONCESIONARIO}</strong>, debe contener 10 números o el formato no es válido.`,
    strTelefonoRepresentante: `El campo <strong>Teléfono Representante</strong> de <strong>${this.FORM_DATOS_CONCESIONARIO}</strong>, debe contener 10 números o el formato no es válido.`,
  };

  actualizarForm: boolean = false;
  formularioCompleto: boolean = false;
  cargarSpinner: boolean = false;
  pdfUrls: { [key: string]: any } = {};
  listaArchivos: any[] = [];

  ID_TRAMITE_REPOSICIONCOM = 11;
  RFC_MORAL_PATTERN = '^([A-ZÑ&]{3})(\\d{6})([A-Z\\d]{3})$';
  buscaRFC = false;
  tarjetaCircCargado: boolean = false;
  dictGasCargado: boolean = false;
  pagoRefCargado: boolean = false;
  ineCargado: boolean = false;
  polizaCargado: boolean = false;
  idTramiteRepoTarjetaCombustible: number = 11;
  idTramite = "";
  configuracion: any[] = [];
  mostrarDictamenGas = false;

  datosConcesionForm!: FormGroup;
  datosConcesionarioForm!: FormGroup;
  documentosUnidadForm!: FormGroup;

  estadoCargaFormularios: { [key: string]: boolean } = {
    datosConcesionForm: false,
    datosConcesionarioForm: false,
    documentosUnidadForm: false
  };

  esModificacion = false;
  listaDocumentos: any;
  documentosFiltrados: any;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly alertaUtility: AlertaUtility,
    private readonly sanitizer: DomSanitizer,
    private readonly modalTerminosCondiciones: NgbModal,
    private readonly router: Router,
    private readonly servicios: ReposicionTarjetaService,
    private readonly activatedRoute: ActivatedRoute
  ) { this.iniciarReintentos(); }

  /*
  ngOnInit() inicializa formularios, configura validaciones, carga PDFs y documentos, 
  obtiene la configuración del trámite y observa cambios en los formularios.
  */
  ngOnInit() {
    this.inicializarFormularios();
    this.detectarTipoTramite();
    this.configurarRFCFisicaMoral();
    this.cargarDefaultPDFs();
    this.obtenerDocumentosTramite();
    this.servicios.cargarConfiguracionTramite(this.ID_TRAMITE_REPOSICIONCOM).subscribe({
      next: (res) => {
        this.configuracion = res;
      },
    });
    this.observarFormularios();
  }

  /*
  detectarTipoTramite() determina si el trámite es una modificación, obtiene el ID del trámite 
  de la URL y, si es necesario, carga sus datos.
  */
  detectarTipoTramite() {
    this.activatedRoute.data.subscribe(data => {
      this.esModificacion = data['modo'] === 'modificar';
    });
    this.activatedRoute.paramMap.subscribe(params => {
      this.idTramite = params.get('id') ?? '';
      if (this.esModificacion && this.idTramite) {
        this.cargarDatosDelTramite(this.idTramite);
      }
    });
  }

  /*
  cargarDatosDelTramite(idTramite) obtiene y carga los datos de un trámite específico, 
  actualiza los formularios con la información recibida, establece los documentos asociados 
  y maneja posibles errores redirigiendo a una página de "not found".
  */
  cargarDatosDelTramite(idTramite: string) {
    this.cargarSpinner = true;
    this.servicios.obtenerTramiteParaCorregir(idTramite).subscribe({
      next: (json: RespuestaGenerica) => {
        this.ocultarDocDictamenGas(json);
        const {
          concesionariosVo, concesionesVo, documentos
        } = json.data;
        this.datosConcesionForm.patchValue(concesionesVo);
        this.datosConcesionarioForm.patchValue(concesionariosVo);
        const encontrarDocumento = (descripcion: string) => {
          return documentos.find((doc: any) => doc.strDescDoc === descripcion)?.strArchivo || null;
        };
        this.listaDocumentos = documentos;
        this.establecerCheckDocumentos(documentos);
        this.cargarArchivosPDFs(encontrarDocumento("REFRENDO VIGENTE ANUAL"),
          encontrarDocumento("ACTA MINISTERIAL"),
          encontrarDocumento("CERTIFICADO DE NO INFRACCIÓN"),
          encontrarDocumento("INE"),
          encontrarDocumento("ULTIMO PAGO DE REFRENDO"),
          encontrarDocumento("TARJETA DE CIRCULACIÓN"),
          encontrarDocumento("DICTAMEN DE GAS"),
          encontrarDocumento("POLIZA DE SEGURO")
        );
        this.cargarSpinner = false;
      },
      error: () => {
        this.cargarSpinner = false;
        this.router.navigate(['not-found'], { skipLocationChange: true });
      },
    });
    this.datosConcesionForm.disable();
    this.datosConcesionarioForm.disable();
  }

  /*
cargarArchivosPDFs asigna URLs seguras a los documentos PDF requeridos, 
garantizando que cada tipo de archivo tenga una referencia válida antes de ser mostrado.
*/
  cargarArchivosPDFs(
    refrendo: string,
    actaMinisterial: string,
    certificado: string,
    ine: string,
    pagoRefrendo: string,
    tarjetaCirculacion: string,
    dictamenGas: string,
    polizaSeguro: string
  ) {
    this.pdfUrls = {
      certificadoNoInfraccion: this.obtenUrlSeguro(refrendo),
      actaMinisterial: this.obtenUrlSeguro(actaMinisterial),
      refrendoAnual: this.obtenUrlSeguro(certificado),
      ine: this.obtenUrlSeguro(ine),
      pagoRefrendo: this.obtenUrlSeguro(pagoRefrendo),
      tarjetaCirculacion: this.obtenUrlSeguro(tarjetaCirculacion),
      dictamenGas: this.obtenUrlSeguro(dictamenGas),
      polizaSeguro: this.obtenUrlSeguro(polizaSeguro)
    };
  }

  /*
obtenUrlSeguro genera una URL segura para visualizar archivos PDF. 
Si no hay contenido, asigna un PDF por defecto; de lo contrario, 
convierte la cadena Base64 en un Blob y crea un objeto URL seguro.
*/
  obtenUrlSeguro(base64: string): SafeResourceUrl {
    if (!base64) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('assets/documents/subirArchivo.pdf');
    }
    const contentType = 'application/pdf';
    const blob = this.creaBlobDeBase64(base64.split(',')[1], contentType);
    const url = URL.createObjectURL(blob);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /*
  creaBlobDeBase64 convierte una cadena Base64 en un Blob. 
  Decodifica la cadena, la transforma en un array de bytes 
  y genera un Blob con el tipo de contenido especificado.
  */
  creaBlobDeBase64(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);//Decodifica
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  /*
  establecerCheckDocumentos actualiza el formulario con los documentos proporcionados. 
  Cada documento se asigna a su campo correspondiente junto con su estado de aceptación.
  */
  establecerCheckDocumentos(documentos: any) {
    documentos.forEach((doc: any) => {
      const status = doc.strAceptado === 'A';
      switch (doc.strDescDoc) {
        case "CERTIFICADO DE NO INFRACCIÓN":
          this.documentosUnidadForm.patchValue({
            certificadoNoInfraccion: { value: doc.strArchivo },
            certificadoNoInfraccionCheckbox: status
          });
          break;
        case "ACTA MINISTERIAL":
          this.documentosUnidadForm.patchValue({
            actaMinisterial: { value: doc.strArchivo },
            actaMinisterialCheckbox: status
          });
          break;
        case "REFRENDO VIGENTE ANUAL":
          this.documentosUnidadForm.patchValue({
            refrendoAnual: { value: doc.strArchivo },
            refrendoAnualCheckbox: status
          });
          break;
        case "INE":
          this.documentosUnidadForm.patchValue({
            ine: { value: doc.strArchivo },
            ineCheckbox: status
          });
          break;
        case "ULTIMO PAGO DE REFRENDO":
          this.documentosUnidadForm.patchValue({
            pagoRefrendo: { value: doc.strArchivo },
            pagoRefrendoCheckbox: status
          });
          break;
        case "TARJETA DE CIRCULACIÓN":
          this.documentosUnidadForm.patchValue({
            tarjetaCirculacion: { value: doc.strArchivo },
            tarjetaCirculacionCheckbox: status
          });
          break;
        case "DICTAMEN DE GAS":
          this.documentosUnidadForm.patchValue({
            dictamenGas: { value: doc.strArchivo },
            dictamenGasCheckbox: status
          });
          break;
        case "POLIZA DE SEGURO":
          this.documentosUnidadForm.patchValue({
            polizaSeguro: { value: doc.strArchivo },
            polizaSeguroCheckbox: status
          });
          break;
      }
    });
  }

  /*
  inicializarFormularios configura los formularios de concesión, concesionario y documentos de la unidad.
  Define los campos, establece validaciones y deshabilita aquellos que no deben ser editables.
  */
  private inicializarFormularios() {
    this.datosConcesionForm = this.formBuilder.group({
      intIdPlaca: 0,
      strNiv: ['', [Validators.required, Validators.minLength(17), Validators.maxLength(17)]],
      strPlaca: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(7)]],
      strCveVeh: [{ value: '', disabled: true }],
      strMotor: [{ value: '', disabled: true }],
      strMarca: [{ value: '', disabled: true }],
      intModelo: [{ value: '', disabled: true }],
      strTipoVeh: [{ value: '', disabled: true }],
      intCapacidad: [{ value: '', disabled: true }],
      intCilindros: [{ value: '', disabled: true }],
      strCombustible: [{ value: '', disabled: true }],
      intRefrendo: [{ value: '', disabled: true }],
      strNoTarjeta: [{ value: '', disabled: true }],
      dtFechaAlta: [{ value: '', disabled: true }],
      dblValorVehiculo: [{ value: '', disabled: true }],
      strEstatus: [{ value: '', disabled: true }],
      strModalidad: [{ value: '', disabled: true }],
      strRepuve: [{ value: '', disabled: true }],
      intIdConcesionSMyT: [{ value: '', disabled: true }],
      intIdVehiculoSMyT: [{ value: '', disabled: true }],
      intIdFolioTCSMyT: [{ value: '', disabled: true }],
      intIdPlacaSMyT: [{ value: '', disabled: true }],
      intIdConcesionarioSMyT: [{ value: '', disabled: true }]
    });

    this.datosConcesionarioForm = this.formBuilder.group({
      strRfc: ['', {
        validators: [Validators.required, this.rfcValidator()],
        updateOn: 'change'  // Validación en cada cambio
      }],
      strNombre: [{ value: '', disabled: true }],
      strCurp: [{ value: '', disabled: true }],
      strApPaterno: [{ value: '', disabled: true }],
      strApMaterno: [{ value: '', disabled: true }],
      strCalleProp: [{ value: '', disabled: true }],
      strNumExt: [{ value: '', disabled: true }],
      strNumInt: [{ value: '', disabled: true }],
      strColonia: [{ value: '', disabled: true }],
      strLocalidad: [{ value: '', disabled: true }],
      strMunicipio: [{ value: '', disabled: true }],
      strEstado: [{ value: '', disabled: true }],
      strSexo: [{ value: '', disabled: true }],
      dtFechaNacimiento: [{ value: '', disabled: true }],
      strCp: [{ value: '', disabled: true }],
      strTelefonoRepresentante: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(10),
        Validators.pattern(/^\d+$/),
        this.validarDigitosRepetidos.bind(this)
      ]
      ],
      strEmail: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      strTelefonoContacto: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(10),
        Validators.pattern(/^\d+$/),
        this.validarDigitosRepetidos.bind(this)
      ]
      ]

    });

    this.documentosUnidadForm = this.formBuilder.group({
      tarjetaCirculacion: [null, Validators.required],
      dictamenGas: [null, Validators.required],
      pagoRefrendo: [null, Validators.required],
      ine: [null, Validators.required],
      polizaSeguro: [null, Validators.required],
      tarjetaCirculacionCheckbox: [{ value: false, disabled: true }],
      dictamenGasCheckbox: [{ value: false, disabled: true }],
      pagoRefrendoCheckbox: [{ value: false, disabled: true }],
      ineCheckbox: [{ value: false, disabled: true }],
      polizaSeguroCheckbox: [{ value: false, disabled: true }],
      aceptaTerminos: [false, Validators.requiredTrue]
    });
  }

  /*
  validaNoTodosIguales verifica si todos los dígitos de un número son iguales.
  Si el número tiene 10 caracteres y todos son idénticos, retorna un error de validación.
  */
  validarDigitosRepetidos(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value || value.length !== 10) return null;

    const primerDigito = value[0];
    const todosIguales = value.split('').every((char: string) => char === primerDigito);

    return todosIguales ? { uniqueDigits: true } : null;
  }

  /*
  rfcValidator valida que el RFC ingresado cumpla con el formato esperado para personas morales.
  Si el RFC no tiene 12 caracteres o no coincide con el patrón definido, retorna un error de validación.
  */
  rfcValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const rfcValue = control.value;
      if (!rfcValue || rfcValue.length !== 12 || !new RegExp(this.RFC_MORAL_PATTERN).test(rfcValue)) {
        return { rfcInvalido: true };
      }

      return null;
    };
  }

  get rfcPlaceholder(): string {
    return 'R.F.C. LLL000000AAA';
  }

  get rfcTooltip(): string {
    return 'L = Letra, 0 = Número, A = Letra ó Número, Formato válido: LLL000000AAA';
  }
  /*
  configurarRFCFisicaMoral establece las validaciones para el campo RFC del formulario de concesionario.
  Se requiere que tenga exactamente 12 caracteres y coincida con el patrón RFC_MORAL_PATTERN.
  Luego, se actualiza la validez del campo.
  */
  configurarRFCFisicaMoral() {
    this.formConcesionario['strRfc'].setValidators([
      Validators.required,
      Validators.minLength(12),
      Validators.maxLength(12),
      Validators.pattern(this.RFC_MORAL_PATTERN)
    ]);
    this.datosConcesionarioForm.get('strRfc')?.updateValueAndValidity();
  }

  /*
  obtenerDocumentosTramite solicita los documentos necesarios para el trámite específico
  utilizando el identificador idTramiteRepoTarjetaCombustible. Los documentos obtenidos 
  se almacenan en listaArchivos. Si ocurre un error en la solicitud, se muestra un mensaje de error.
  */
  obtenerDocumentosTramite() {
    let valores = {
      intIdTipoTramite: this.idTramiteRepoTarjetaCombustible
    }
    this.servicios.obtenerDocumentosTramite(valores).subscribe({
      next: (value: any) => {
        this.listaArchivos = value.data
      },
      error: (err: HttpErrorResponse) => {
        this.muestraErrorGeneral(err);
      }
    });
  }

  /*
  observarFormularios monitorea los cambios en los formularios de concesión y concesionario. 
  Si el formulario no está en modo de modificación, detecta cuando los campos clave 
  (strNiv y strPlaca en datosConcesionForm, strRfc en datosConcesionarioForm) alcanzan la longitud esperada 
  y son válidos, lo que activa la carga automática de datos en el formulario correspondiente.
  */
  private observarFormularios() {
    if (this.esModificacion) return;
    this.datosConcesionForm.valueChanges.subscribe((values) => {
      if (this.actualizarForm) return;
      const { strNiv, strPlaca } = values;
      if (strNiv?.length === 17 && strPlaca?.length === 7) {
        this.formularioCompleto = true;
        this.cargarDatosFormulario(this.datosConcesionForm, 'datosConcesionForm', false);
      }
    });

    this.datosConcesionarioForm.get('strRfc')?.valueChanges.subscribe((strRfc) => {
      if (this.actualizarForm) return;
      setTimeout(() => {
        if (strRfc && strRfc.length === 12 && this.formConcesionario['strRfc'].valid) {
          this.formularioCompleto = true;
          this.cargarDatosFormulario(this.datosConcesionarioForm, 'datosConcesionarioForm', false);
        }
      }, 0);
    });
  }

  /*
  ngAfterViewInit se ejecuta después de que la vista y sus elementos hijos han sido inicializados. 
  En este caso, llama a validaCamposConAutocomplete para asegurar que los campos con autocompletado 
  se validen correctamente una vez que la vista está lista.
  */
  ngAfterViewInit() {
    this.validaCamposConAutocomplete();
  }

  /*
  validaCamposConAutocomplete agrega un listener al campo de correo electrónico (strEmail) para detectar 
  cambios en su valor cuando el usuario escribe o cuando un navegador completa el campo automáticamente. 
  Esto fuerza la actualización de la validación del campo, asegurando que se reflejen cambios y errores 
  de manera inmediata.
  */
  validaCamposConAutocomplete() {
    const strEmailElement = document.getElementById('strEmail') as HTMLInputElement;
    if (strEmailElement) {
      strEmailElement.addEventListener('input', () => {
        const strEmailControl = this.datosConcesionarioForm.get('strEmail');
        if (strEmailControl) {
          strEmailControl.markAsDirty();
          strEmailControl.markAsTouched();
          strEmailControl.updateValueAndValidity();
        }
      });
    }
  }

  /*
  cargarDatosFormulario maneja la validación y carga de datos en los formularios, asegurando que 
  los campos requeridos estén completos antes de avanzar al siguiente paso del proceso. Si se accede 
  desde "NextStep", valida y muestra alertas en caso de errores. Si no, obtiene los datos desde un servicio 
  según el formulario, actualiza los valores y limpia los formularios siguientes en caso necesario. 
  También maneja errores de conexión y respuestas del servicio.
  */
  cargarDatosFormulario(formulario: FormGroup, nombreFormulario: ClavesFormulario, desdeNextStep: boolean) {
    if (desdeNextStep) {
      if (this.esModificacion) {
        this.stepper.next();
        return;
      }
      if (formulario.invalid) {
        formulario.markAllAsTouched();
        const primerCampoInvalido = this.obtenerPrimerCampoInvalido(formulario);
        if (primerCampoInvalido) {
          const descripcion = this.descripciones[primerCampoInvalido] || 'Este campo es obligatorio';
          this.muestraError(descripcion);
          this.buscaRFC = false;
          if (this.formularioCompleto && nombreFormulario != 'datosConcesionarioForm') {
            this.resetFormulario(nombreFormulario);
            this.formularioCompleto = false;
          }
          return;
        }
      }
      if (nombreFormulario === 'datosConcesionForm') {
        if (this.esModificacion) return;
        this.alertaUtility.mostrarAlerta({
          message: '¿Estimado usuario, está seguro de que los datos mostrados pertenecen a su concesión?',
          icon: 'question',
          showConfirmButton: true,
          confirmButtonColor: COLOR_SI,
          confirmButtonText: 'Si',
          showDenyButton: true,
          denyButtonText: 'No',
          showCloseButton: false
        }).then(result => {
          if (result.isConfirmed) {
            this.formularioCompleto = false;
            this.limpiarFormulariosSiguientes(nombreFormulario);
            this.stepper.next();
          }
        });
      } else {
        this.formularioCompleto = false;
        this.stepper.next();
      }
    } else {
      if (this.esModificacion) return;
      let valores = formulario.value;
      if (nombreFormulario === 'datosConcesionForm') {
        const { strNiv, strPlaca } = this.datosConcesionForm.value;
        valores = {
          strNiv,
          strPlaca,
          esPersonaFisica: false,
          intIdTipoTramite: this.idTramiteRepoTarjetaCombustible,
          configTramite: this.configuracion
        }
      } else if (nombreFormulario === 'datosConcesionarioForm') {
        const { strRfc } = this.datosConcesionarioForm.value;
        const { strNiv, strPlaca } = this.datosConcesionForm.value;
        const { intId } = this.datosConcesionForm.value;
        valores = {
          strRfc, strNiv, strPlaca, intId
        }
      }
      const url = this.obtenerURLFormulario(nombreFormulario);
      if (!url) {
        this.muestraError(`URL no encontrada para el formulario ${nombreFormulario}`);
        return;
      }
      this.cargarSpinner = true;
      this.servicios.obtenerDatosFormulario(url, valores).subscribe({
        next: (value: any) => {
          if (url === '/tramites/obtenerPlacaNiv') {
            this.ocultarDocDictamenGas(value);
          }
          this.actualizarForm = true;
          formulario.patchValue(value.data, { emitEvent: false });
          if (nombreFormulario === 'datosConcesionarioForm') {
            this.buscaRFC = true;
          }
          this.limpiarFormulariosSiguientes(nombreFormulario);
          this.actualizarForm = false;
          this.cargarSpinner = false;
        },
        error: (err: HttpErrorResponse) => {
          let message: string;
          if (err.error instanceof ErrorEvent) {
            message = 'Ocurrió un problema con la conexión de red. Por favor, verifica tu conexión a internet.';
          } else if (err.status === 0) {
            message = 'El servicio no está disponible en este momento.<p> Intente nuevamente más tarde.';
          } else {
            message = err.error.strMessage;
          }
          this.cargarSpinner = false;
          this.muestraError(message);
          this.cargarDefaultPDFs();
          this.resetFormulario(nombreFormulario);
          this.limpiarFormulariosSiguientes(nombreFormulario);
        }
      });
    }
  }

  /**
 * Controla la visibilidad y validación del campo `dictamenGas` en el formulario.
 *
 * Este método verifica si el combustible en la respuesta es "GASOLINA".
 * Si es así, muestra el campo `dictamenGas` y lo hace obligatorio.
 * De lo contrario, lo oculta y elimina la validación requerida.
 *
 * @param {RespuestaGenerica} response - Objeto de respuesta que contiene la información del combustible.
 */
  ocultarDocDictamenGas(response: RespuestaGenerica) {
    this.mostrarDictamenGas = response.data.strCombustible === 'GASOLINA';
    const control = this.formDocumentos['dictamenGas'];
    control.setValidators(this.mostrarDictamenGas ? Validators.required : null);
    control.updateValueAndValidity();
  }

  /*
  pdfSeleccionado maneja la validación y carga de archivos PDF en el formulario. 
  Verifica que el archivo sea de tipo 'application/pdf' y que no supere los 2MB. 
  Si el archivo es válido, lo convierte a Base64, actualiza el formulario y genera 
  una URL segura para su previsualización. En caso de error, muestra alertas 
  correspondientes y limpia el campo de entrada.
  */
  pdfSeleccionado(event: Event, controlName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      const fileType = file.type;
      if (fileType !== 'application/pdf') {
        this.alertaUtility.mostrarAlerta({
          message: 'Por favor selecciona un archivo PDF.',
          icon: 'warning',
          showConfirmButton: true,
          confirmButtonColor: COLOR_CONFIRMAR,
          confirmButtonText: 'Confirmar',
          showCloseButton: false,
          allowOutsideClick: true
        });
        input.value = '';
        return;
      }
      const maxSizeInMB = 2;
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        this.alertaUtility.mostrarAlerta({
          message: 'El archivo no debe ser mayor a 2MB.',
          icon: 'warning',
          showConfirmButton: true,
          confirmButtonColor: COLOR_CONFIRMAR,
          confirmButtonText: 'Confirmar',
          showCloseButton: false,
          allowOutsideClick: true
        });
        input.value = '';
        return;
      }

      convertirPDFbase64(file).then((base64: string) => {
        this.documentosUnidadForm.patchValue({
          [controlName]: base64
        });
        const fileURL = URL.createObjectURL(file);
        this.pdfUrls[controlName] = this.sanitizer.bypassSecurityTrustResourceUrl(fileURL);
        this.actualizaCargaArchivos(controlName);
      }).catch(() => {
        this.muestraError('Error al procesar el archivo PDF.');
        input.value = '';
      });
    }
  }

  /*
  actualizaCargaArchivos marca los documentos como cargados según el controlName recibido. 
  Se usa en la función pdfSeleccionado para actualizar indicadores de carga después de que 
  un archivo ha sido validado y agregado al formulario. Esto permite gestionar el estado 
  de carga de cada documento y realizar acciones en la UI según corresponda.
  */
  actualizaCargaArchivos(controlName: string) {
    if (controlName) {
      switch (controlName) {
        case 'tarjetaCirculacion':
          this.tarjetaCircCargado = true;
          break;
        case 'dictamenGas':
          this.dictGasCargado = true;
          break;
        case 'pagoRefrendo':
          this.pagoRefCargado = true;
          break;
        case 'ine':
          this.ineCargado = true;
          break;
        default:
          break;
      }
    }
  }


  /**
   * Registra o actualiza un trámite de concesión dependiendo del estado del proceso.
   * Si es una modificación, obtiene los documentos actualizados y envía la corrección.
   * Si es un nuevo registro, recopila la información del concesionario y del vehículo,
   * genera un JSON con los datos y lo envía al servicio correspondiente.
   * 
   * Muestra una alerta de confirmación antes de proceder. Si el trámite se registra
   * exitosamente, se envía a otro servicio para su validación y procesamiento adicional.
   * 
   * En caso de error, maneja diferentes tipos de fallos, mostrando alertas informativas
   * al usuario y reintentando la operación si es necesario.
   */
  registraInformacion() {
    let urlPasarela: string;
    let json = {};

    if (this.esModificacion) {
      this.obtenDocumentosParaModificar();
      json = {
        documentos: this.documentosFiltrados,
        intIdTramite: this.idTramite
      }
    } else {
      this.obtenDocumentos();

      json = {
        intId: 0,
        strPlaca: this.formConcesion['strPlaca'].value,
        strNiv: this.formConcesion['strNiv'].value,
        strRfc: this.formConcesionario['strRfc'].value,
        intIdPlaca: this.formConcesion['intIdPlaca'].value,
        strEmail: this.formConcesionario['strEmail'].value,
        strTelefonoContacto: this.formConcesionario['strTelefonoContacto'].value,
        strTelefonoRepresentante: this.formConcesionario['strTelefonoRepresentante'].value,
        intIdTipoTramite: this.idTramiteRepoTarjetaCombustible,
        documentacionVo: this.listaArchivos,
        bolPersonaFisica: false,
        concesion: {
          intIdPlaca: 0,
          strPlaca: this.formConcesion['strPlaca'].value,
          strNiv: this.formConcesion['strNiv'].value,
          strCveVeh: this.formConcesion['strCveVeh'].value,
          strMotor: this.formConcesion['strMotor'].value,
          strMarca: this.formConcesion['strMarca'].value,
          intModelo: this.formConcesion['intModelo'].value,
          strTipoVeh: this.formConcesion['strTipoVeh'].value,
          intCapacidad: this.formConcesion['intCapacidad'].value,
          intCilindros: this.formConcesion['intCilindros'].value,
          strCombustible: this.formConcesion['strCombustible'].value,
          intRefrendo: this.formConcesion['intRefrendo'].value,
          strNoTarjeta: this.formConcesion['strNoTarjeta'].value,
          dtFechaAlta: this.formConcesion['dtFechaAlta'].value,
          dblValorVehiculo: this.formConcesion['dblValorVehiculo'].value,
          strRepuve: this.formConcesion['strRepuve'].value,
          strEstatus: this.formConcesion['strEstatus'].value,
          strModalidad: this.formConcesion['strModalidad'].value
        },
        concesionario: {
          strNiv: this.formConcesion['strNiv'].value,
          strRfc: this.formConcesionario['strRfc'].value,
          strPlaca: this.formConcesion['strPlaca'].value,
          strEmail: this.formConcesionario['strEmail'].value,
          strNombre: this.formConcesionario['strNombre'].value,
          strApPaterno: this.formConcesionario['strApPaterno'].value,
          strApMaterno: this.formConcesionario['strApMaterno'].value,
          strCalleProp: this.formConcesionario['strCalleProp'].value,
          strNumExt: this.formConcesionario['strNumExt'].value,
          strNumInt: this.formConcesionario['strNumInt'].value,
          strColonia: this.formConcesionario['strColonia'].value,
          strLocalidad: this.formConcesionario['strLocalidad'].value,
          strMunicipio: this.formConcesionario['strMunicipio'].value,
          strEstado: this.formConcesionario['strEstado'].value,
          strTelefonoContacto: this.formConcesionario['strTelefonoContacto'].value,
          strTelefonoRepresentante: this.formConcesionario['strTelefonoRepresentante'].value,
          strCp: this.formConcesionario['strCp'].value,
          strCurp: this.formConcesionario['strCurp'].value,
          strSexo: this.formConcesionario['strSexo'].value,
          dtFechaNacimiento: this.formConcesionario['dtFechaNacimiento'].value
        }
      };
    }

    this.alertaUtility.mostrarAlerta({
      message: '¿Estás seguro que deseas guardar la información?',
      icon: 'question',
      showConfirmButton: true,
      confirmButtonColor: COLOR_SI,
      confirmButtonText: 'Si',
      showDenyButton: true,
      denyButtonText: 'No',
      showCloseButton: false
    }).then(result => {
      if (result.isConfirmed) {
        this.cargarSpinner = true;
        if (this.esModificacion) {
          this.servicios.corregirTramite(json).subscribe({
            next: () => {
              this.cargarSpinner = false;
              this.alertaUtility.mostrarAlerta({
                message: 'Trámite actualizado correctamente',
                icon: 'success',
                showConfirmButton: true,
                confirmButtonColor: COLOR_SI,
                confirmButtonText: 'Aceptar',
                showCloseButton: false,
                allowOutsideClick: true
              }).then(result => {
                if (result.isConfirmed) {
                  this.reiniciaFormulario();
                }
              });
            },
            error: (err: HttpErrorResponse) => {
              let message: string;
              if (err.error instanceof ErrorEvent) {
                message = 'Ocurrió un problema con la conexión de red. Por favor, verifica tu conexión a internet.';
              } else if (err.status === 0) {
                message = 'El servicio no está disponible en este momento.<p> Intente nuevamente más tarde.';
              } else {
                message = err.error.strMessage;
              }
              this.cargarSpinner = false;
              this.muestraError(message);
            },
          });
        } else {
          this.servicios.registrarTramite(json).pipe(
            switchMap(value => {
              if (value.bolStatus) {
                const intIdTramite = value.data.intIdTramite;
                let jsonSmyt = {
                  intIdConcesion: this.formConcesion['intIdConcesionSMyT'].value,
                  intIdPlaca: this.formConcesion['intIdPlacaSMyT'].value,
                  intIdVehiculo: this.formConcesion['intIdVehiculoSMyT'].value,
                  intIdModalidad: value.data.tramite.intIdModalidad,
                  fltTotal: value.data.tramite.dblImporte,
                  strPlaca: this.formConcesion['strPlaca'].value,
                  intIdTramite
                }
                return this.servicios.registrarTramiteSmyt(jsonSmyt).pipe(
                  retryWhen(errors =>
                    errors.pipe(
                      delayWhen(() => timer(5000)), // Espera 5 segundos antes de reintentar
                      switchMap((error, index) => index < 2 ? of(error) : throwError(error)) // Reintenta 2 veces
                    )
                  ),
                  catchError(err => {
                    console.error("Error en registrarTramiteSmyt, guardando para reintentar después:", err);
                    this.guardarTramiteFallido(jsonSmyt);
                    return of(null);
                  }),
                  map(responseSmyt => ({ responseSmyt, intIdTramite }))
                );
              }
              return of(null);
            })
          ).subscribe({
            next: (value: any) => {
              const email = this.datosConcesionarioForm.get('strEmail')?.value;
              const strCodigo = value.intIdTramite || '';
              let htmlTramiteEnviado = "";
              if (email) {
                htmlTramiteEnviado = `
                  <div>
                    <h4>Estimado usuario, la solicitud fue enviada con éxito</h4>
                    <hr>
                    En un lapso de 24 a 48 horas notificaremos a través de tu <b>correo electrónico:</b>
                    <b><p style="color: #a11a5c;">${email}</p></b>
                    la información sobre el seguimiento al trámite por parte de SMyT.
                    <p>
                    <h5><b>Folio Trámite: ${strCodigo}</b></h5>
                    Gracias.
                  </div>
                `;
              }
              this.cargarSpinner = false;
              this.alertaUtility.mostrarAlerta({
                message: htmlTramiteEnviado,
                icon: 'success',
                showConfirmButton: true,
                confirmButtonColor: COLOR_SI,
                confirmButtonText: 'Aceptar',
                showCloseButton: false,
                allowOutsideClick: false,
              }).then(result => {
                if (result.isConfirmed) {
                  this.reiniciaFormulario();
                  this.stepper.reset();
                  this.router.navigate([this.router.url], { skipLocationChange: true });
                }
              });
            }, error: (err) => {
              this.cargarSpinner = false;
              this.muestraError(err.error.message);
            }
          })
        }
      } else {
        this.muestraError('La operación fue cancelada');
      }
    });
  }

  /**
   * Filtra y actualiza la lista de documentos que requieren modificación.
   * Se eliminan los documentos aceptados previamente y se asignan los valores 
   * actualizados desde el formulario correspondiente. 
   * 
   * Luego, normaliza la lista asegurando que los archivos sean correctamente 
   * extraídos de sus valores anidados antes de almacenarlos en la variable 
   * `documentosFiltrados`.
   */
  obtenDocumentosParaModificar() {
    if (this.listaDocumentos) {
      const documentosFiltrados = this.listaDocumentos
        .filter((doc: any) => doc.strAceptado !== 'A').map((doc: any) => ({
          intIdDocumento: doc.intIdDocumento,
          strArchivo: doc.strArchivo,
          intIdDocumentacion: doc.intIdDocumentacion,
          strDescripcion: doc.strDescDoc
        }))
      documentosFiltrados.forEach((doc: any) => {
        switch (doc.strDescripcion) {
          case "CERTIFICADO DE NO INFRACCIÓN":
            doc.strArchivo = this.formDocumentos['certificadoNoInfraccion'].value;
            break;
          case "ACTA MINISTERIAL":
            doc.strArchivo = this.formDocumentos['actaMinisterial'].value;
            break;
          case "REFRENDO VIGENTE ANUAL":
            doc.strArchivo = this.formDocumentos['refrendoAnual'].value;
            break;
          case "INE":
            doc.strArchivo = this.formDocumentos['ine'].value;
            break;
          case "ULTIMO PAGO DE REFRENDO":
            doc.strArchivo = this.formDocumentos['pagoRefrendo'].value;
            break;
          case "TARJETA DE CIRCULACIÓN":
            doc.strArchivo = this.formDocumentos['tarjetaCirculacion'].value;
            break;
          case "DICTAMEN DE GAS":
            doc.strArchivo = this.formDocumentos['dictamenGas'].value;
            break;
          case "POLIZA DE SEGURO":
            doc.strArchivo = this.formDocumentos['polizaSeguro'].value;
            break;
          default:
            doc.strArchivo = "";
            break;
        }
      });
      const normalizarLista = (documentosFiltrados: any[]) => {
        return documentosFiltrados.map(doc => {
          if (doc.strArchivo && typeof doc.strArchivo === 'object' && 'value' in doc.strArchivo) {
            doc.strArchivo = doc.strArchivo.value;
          }
          return doc;
        });
      };
      const listaNormalizada = normalizarLista(documentosFiltrados);
      this.documentosFiltrados = listaNormalizada;
    }
  }


  /**
   * Reinicia los formularios siguientes al formulario actual, a menos que se trate de una modificación.
   * 
   * Si `esModificacion` es verdadero, la función no realiza ninguna acción.
   * En caso contrario, obtiene la lista de formularios, encuentra la posición 
   * del formulario actual y restablece todos los formularios posteriores en la lista.
   * 
   * @param formularioActual - Clave del formulario desde el cual se limpiarán los siguientes.
   */
  private limpiarFormulariosSiguientes(formularioActual: ClavesFormulario) {
    if (this.esModificacion) return;
    const formularios: ClavesFormulario[] = [
      'datosConcesionForm',
      'datosConcesionarioForm',
      'documentosUnidadForm',
    ];
    const indiceFormularioActual = formularios.indexOf(formularioActual);
    formularios.slice(indiceFormularioActual + 1).forEach((formulario) => {
      this.resetFormulario(formulario);
    });
  }

  /**
   * Restablece el formulario especificado a su estado inicial.
   * 
   * Si el formulario existe, se resetea, se marca como "prístino" (sin cambios) 
   * y se marca como "no tocado" (sin interacción del usuario).
   * 
   * @param nombreFormulario - Clave del formulario a restablecer.
   */
  private resetFormulario(nombreFormulario: ClavesFormulario) {
    const formulario = this[nombreFormulario];
    if (formulario) {
      formulario.reset();
      formulario.markAsPristine();
      formulario.markAsUntouched();
    }
  }

  /**
 * Reinicia el formulario y restablece el estado inicial de la vista.
 * 
 * - Resetea el stepper a su primer paso.
 * - Carga los PDFs predeterminados.
 * - Bloquea la visualización de archivos.
 * - Redirige a la ruta '/persona-moral' sin afectar el historial de navegación.
 */
  reiniciaFormulario() {
    this.stepper.reset();
    this.cargarDefaultPDFs();
    this.bloqueaVerArchivos();
    this.router.navigate(['/persona-moral'], { skipLocationChange: true });
  }


  /**
   * Obtiene y procesa la lista de documentos asociados.
   * 
   * - Mapea la lista de archivos para crear un nuevo arreglo de documentos.
   * - Asigna valores a los documentos según su tipo, extrayéndolos del formulario correspondiente.
   * - Actualiza la lista de archivos con los documentos procesados.
   */
  obtenDocumentos() {
    if (this.listaArchivos) {
      const nuevosDocumentos = this.listaArchivos.map((doc) => {
        return {
          intIdDocumentacion: doc.intIdDocumentacion,
          strNombreDocumento: doc.strNombreDocumento,
          strArchivo: ``
        };
      });
      nuevosDocumentos.forEach(doc => {
        switch (doc.strNombreDocumento) {
          case "ULTIMO PAGO DE REFRENDO":
            doc.strArchivo = this.formDocumentos['pagoRefrendo'].value;
            break;
          case "TARJETA DE CIRCULACIÓN":
            doc.strArchivo = this.formDocumentos['tarjetaCirculacion'].value;
            break;
          case "DICTAMEN DE GAS":
            doc.strArchivo = this.formDocumentos['dictamenGas'].value;
            break;
          case "INE":
            doc.strArchivo = this.formDocumentos['ine'].value;
            break;
          case "POLIZA DE SEGURO":
            doc.strArchivo = this.formDocumentos['polizaSeguro'].value;
            break;
          default:
            doc.strArchivo = "";
            break;
        }
      })
      this.listaArchivos = nuevosDocumentos;
    }
  }

  /**
   * Deshabilita la visualización de los archivos cargados.
   * 
   * - Restablece los indicadores de carga de los documentos a `false`,
   *   impidiendo su visualización hasta que sean cargados nuevamente.
   */
  bloqueaVerArchivos() {
    this.tarjetaCircCargado = false;
    this.dictGasCargado = false;
    this.pagoRefCargado = false;
    this.ineCargado = false;
  }




  /**
   * Obtiene el nombre del primer campo inválido dentro de un formulario.
   * 
   * @param formulario - FormGroup que contiene los controles a evaluar.
   * @returns El nombre del primer campo inválido o una cadena vacía si todos son válidos.
   */
  private obtenerPrimerCampoInvalido(formulario: FormGroup): string {
    const controles = formulario.controls;
    for (const campo in controles) {
      if (controles[campo].invalid) {
        return campo;
      }
    }
    return '';
  }

  /**
   * Muestra un mensaje de error general basado en la respuesta HTTP recibida.
   * 
   * @param err - Objeto HttpErrorResponse que contiene la información del error.
   */
  muestraErrorGeneral(err: HttpErrorResponse) {
    let message: string;
    if (err.error instanceof ErrorEvent) {
      message = 'Ocurrió un problema con la conexión de red. Por favor, verifica tu conexión a internet.';
    } else if (err.status === 0) {
      message = 'El servicio no está disponible en este momento.<p> Intente nuevamente más tarde.';
    } else {
      message = err.error.strMessage;
    }
    this.muestraError(message);
  }

  /**
   * Muestra un mensaje de error en una alerta modal.
   * 
   * @param message - Texto del mensaje de error a mostrar.
   */
  muestraError(message: string) {
    this.alertaUtility.mostrarAlerta({
      message: message,
      icon: 'error',
      showConfirmButton: true,
      confirmButtonColor: COLOR_CONFIRMAR,
      confirmButtonText: 'Confirmar',
      showCloseButton: false,
      allowOutsideClick: true
    });
  }

  /**
   * Carga las URLs predeterminadas de los documentos PDF, asignando un archivo por defecto 
   * a cada tipo de documento para su visualización en la interfaz.
   */
  private cargarDefaultPDFs() {
    const defaultPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl('assets/documents/subirArchivo.pdf');
    this.pdfUrls = {
      tarjetaCirculacion: defaultPdfUrl,
      dictamenGas: defaultPdfUrl,
      pagoRefrendo: defaultPdfUrl,
      ine: defaultPdfUrl,
      polizaSeguro: defaultPdfUrl
    };
  }

  /*
    Muestra un modal con una imagen específica y configuraciones de animación para su aparición y desaparición.
    No recibe parámetros y no retorna ningún valor.
    Utiliza el servicio `alertaUtility` para gestionar la alerta, que no incluye botón de cierre y permite hacer clic fuera del modal.
  */
  muestraModalConImagen() {
    let img = '/assets/images/LogoTlaxMoral.png';
    this.alertaUtility.mostrarAlerta({
      message: '',
      imageUrl: img,
      showCloseButton: false,
      allowOutsideClick: true,
      showClass: {
        popup: `
          animate__animated
          animate__fadeInUp
          animate__faster
        `
      },
      hideClass: {
        popup: `
          animate__animated
          animate__fadeOutDown
          animate__faster
        `
      }
    });
  }

  /*
    Obtiene la URL del endpoint correspondiente según el formulario proporcionado.
    Recibe un parámetro `formulario` (string) y retorna un string con la URL del endpoint asociada.
    Si el formulario no está definido, lanza un error indicando que no existe un endpoint para ese formulario.
  */
  obtenerURLFormulario(formulario: string) {
    let endpoint = '';
    switch (formulario) {
      case 'datosConcesionForm':
        endpoint = '/tramites/obtenerPlacaNiv';
        break;
      case 'datosConcesionarioForm':
        endpoint = '/tramites/obtenerRfcPlaca';
        break;
      case 'documentosUnidadForm':
        endpoint = '';
        break;
      default:
        throw new Error(`No existe un endpoint para el formulario: ${formulario}`);
    }
    return endpoint;
  }

  /*
    Abre un modal que muestra el componente `TerminosCondicionesComponent`.
    No recibe parámetros y no retorna ningún valor.
    El modal se abre con un tamaño extra grande (`xl`) y centrado en la pantalla.
  */
  openModal() {
    this.modalTerminosCondiciones.open(TerminosCondicionesComponent, { size: 'xl', centered: true });
  }

  /*
    Guarda un nuevo trámite fallido en el almacenamiento local (`localStorage`).
    Recibe un parámetro `nuevoJsonSmyt` (cualquier tipo) y lo agrega a la lista de trámites fallidos almacenada.
    Si no existe una lista de trámites fallidos en el almacenamiento local, se crea una nueva.
  */
  guardarTramiteFallido(nuevoJsonSmyt: any) {
    let tramitesFallidos = JSON.parse(localStorage.getItem('tramitesFallidos') || '[]');
    tramitesFallidos.push(nuevoJsonSmyt);
    localStorage.setItem('tramitesFallidos', JSON.stringify(tramitesFallidos));
  }

  /*
    Reintenta registrar los trámites fallidos almacenados en `localStorage`.
    Recupera la lista de trámites fallidos y, para cada uno, intenta registrarlo nuevamente.
    Si el trámite se registra correctamente, se elimina de la lista de trámites fallidos en el almacenamiento local.
    Si ocurre un error al intentar registrar un trámite, se muestra un mensaje de error en la consola.
  */
  reintentarTramitesFallidos() {
    let tramitesFallidos = JSON.parse(localStorage.getItem('tramitesFallidos') || '[]');
    tramitesFallidos.forEach((tramite: any, index: any) => {
      this.servicios.registrarTramiteSmyt(tramite).subscribe({
        next: () => {
          tramitesFallidos.splice(index, 1);
          localStorage.setItem('tramitesFallidos', JSON.stringify(tramitesFallidos));
        },
        error: () => {
          console.error('Error al reintentar trámite fallido');
        }
      });
    });
  }

  /*
    Inicia un proceso de reintento automático de trámites fallidos cada 5 minutos (300,000 ms).
    Llama al método `reintentarTramitesFallidos` en intervalos regulares de tiempo.
    No recibe parámetros y no retorna ningún valor.
  */
  iniciarReintentos() {
    setInterval(() => {
      this.reintentarTramitesFallidos();
    }, 300000);
  }

  get formConcesion() {
    return this.datosConcesionForm.controls;
  }

  get formConcesionario() {
    return this.datosConcesionarioForm.controls;
  }

  get formDocumentos() {
    return this.documentosUnidadForm.controls;
  }

  mostrarForm(){
    console.log(this.formDocumentos)
  }
}
