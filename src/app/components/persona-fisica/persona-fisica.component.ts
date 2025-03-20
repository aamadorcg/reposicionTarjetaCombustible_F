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
  selector: 'app-persona-fisica',
  templateUrl: './persona-fisica.component.html',
  styleUrls: ['./persona-fisica.component.css']
})

export class PersonaFisicaComponent {

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
  RFC_FISICA_PATTERN = '^([A-ZÑ&]{4})(\\d{6})([A-Z\\d]{3})$';
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

  /**
 * Método de inicialización del componente. Inicializa los formularios, detecta el tipo de trámite, configura el RFC, carga los PDFs por defecto, obtiene los documentos del trámite, carga la configuración del trámite desde el servicio y observa cambios en los formularios.
 */
  ngOnInit() {
    this.inicializarFormularios();
    this.detectarTipoTramite();
    this.configurarRFC();
    this.cargarDefaultPDFs();
    this.obtenerDocumentosTramite();
    this.servicios.cargarConfiguracionTramite(this.ID_TRAMITE_REPOSICIONCOM).subscribe({
      next: (res) => {
        this.configuracion = res;
      },
    });
    this.observarFormularios();
  }

  /**
 * Detecta el tipo de trámite verificando los datos de la ruta. 
 * Determina si es una modificación y obtiene el ID del trámite. 
 * Si es una modificación y hay un ID válido, carga los datos del trámite.
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

  /**
 * Carga los datos del trámite a corregir. Activa el spinner, obtiene los datos del trámite desde el servicio 
 * y asigna la información a los formularios correspondientes. Busca y carga los documentos asociados, 
 * establece los checks de documentos y deshabilita los formularios. En caso de error, redirige a la página de no encontrado.
 */
  cargarDatosDelTramite(idTramite: string) {
    this.cargarSpinner = true;
    this.servicios.obtenerTramiteParaCorregir(idTramite).subscribe({
      next: (json: RespuestaGenerica) => {
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

  /**
 * Carga las URLs seguras de los archivos PDF correspondientes a los documentos requeridos del trámite 
 * y los asigna a la estructura de datos para su visualización o descarga.
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

  /**
 * Genera una URL segura a partir de un archivo en base64. Si el archivo no está disponible, 
 * devuelve un enlace a un archivo por defecto. Convierte el base64 en un Blob y crea una URL 
 * segura utilizando el sanitizer.
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

  /**
 * Convierte una cadena en base64 a un objeto Blob. Decodifica la cadena base64, 
 * la transforma en un array de bytes y crea un Blob con el tipo de contenido especificado.
 */
  creaBlobDeBase64(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  /**
 * Establece los valores y el estado de aceptación de los documentos en el formulario. 
 * Recorre la lista de documentos, asigna los archivos correspondientes y actualiza 
 * los checkboxes según el estado de aceptación.
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

  /**
 * Inicializa los formularios del componente. Define los controles y validaciones para 
 * los datos de la concesión, el concesionario y los documentos de la unidad. 
 * Algunos campos se configuran como deshabilitados y se aplican validaciones específicas 
 * como formatos de RFC, correo electrónico y número de teléfono.
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

  /**
 * Valida que un número no tenga todos sus dígitos iguales. 
 * Si el valor tiene 10 caracteres idénticos, devuelve un error de validación; 
 * de lo contrario, retorna null.
 */
  validarDigitosRepetidos(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value || value.length !== 10) return null;

    const primerDigito = value[0];
    const todosIguales = value.split('').every((char: string) => char === primerDigito);

    return todosIguales ? { uniqueDigits: true } : null;
  }

  /**
 * Valida que el RFC ingresado cumpla con el formato correcto. 
 * Verifica que tenga 13 caracteres y coincida con el patrón definido para personas físicas. 
 * Retorna un error si el RFC es inválido, de lo contrario, retorna null.
 */
  rfcValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const rfcValue = control.value;
      if (!rfcValue || rfcValue.length !== 13 || !new RegExp(this.RFC_FISICA_PATTERN).test(rfcValue)) {
        return { rfcInvalido: true };
      }
      return null;
    };
  }

  get rfcPlaceholder(): string {
    return 'R.F.C. LLLL000000AAA';
  }

  get rfcTooltip(): string {
    return 'L = Letra, 0 = Número, A = Letra ó Número, Formato válido: LLLL000000AAA';
  }

  /**
 * Configura las validaciones del campo RFC en el formulario del concesionario. 
 * Establece como obligatorio, define la longitud exacta de 13 caracteres y aplica 
 * un patrón de validación para personas físicas. Luego, actualiza la validez del campo.
 */
  configurarRFC() {
    this.formConcesionario['strRfc'].setValidators([
      Validators.required,
      Validators.minLength(13),
      Validators.maxLength(13),
      Validators.pattern(this.RFC_FISICA_PATTERN)
    ]);
    this.datosConcesionarioForm.get('strRfc')?.updateValueAndValidity();
  }

  /**
 * Obtiene la lista de documentos requeridos para el trámite. 
 * Envía el ID del tipo de trámite al servicio y asigna la respuesta a la lista de archivos. 
 * En caso de error, muestra un mensaje de error general.
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

  /**
 * Observa los cambios en los formularios para detectar cuando están completos. 
 * Si no es una modificación, verifica la longitud del NIV y la placa en el formulario de concesión, 
 * y la validez del RFC en el formulario del concesionario. Si los datos son válidos, 
 * marca el formulario como completo y carga los datos correspondientes.
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
        if (strRfc && strRfc.length === 13 && this.formConcesionario['strRfc'].valid) {
          this.formularioCompleto = true;
          this.cargarDatosFormulario(this.datosConcesionarioForm, 'datosConcesionarioForm', false);
        }
      }, 0);
    });
  }

  /**
 * Método que se ejecuta después de que la vista ha sido inicializada. 
 * Llama a la función para validar los campos que tienen autocompletado.
 */
  ngAfterViewInit() {
    this.validaCamposConAutocomplete();
  }

  /**
 * Agrega un evento de escucha al campo de correo electrónico para detectar cambios 
 * cuando el usuario ingresa o modifica el valor. Marca el campo como modificado y tocado, 
 * y actualiza su validez en el formulario del concesionario.
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

  /**
 * Carga los datos en un formulario específico y gestiona la validación y navegación entre pasos. 
 * Si se accede desde `nextStep`, valida el formulario y, en caso de ser válido, avanza al siguiente paso. 
 * Para el formulario de concesión, muestra una alerta de confirmación antes de continuar. 
 * Si se accede sin `nextStep`, obtiene los valores del formulario y los envía al servicio correspondiente. 
 * Maneja errores de conexión y restablece los formularios en caso de fallo.
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
          esPersonaFisica: true,
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

  ocultarDocDictamenGas(response: RespuestaGenerica) {
    this.mostrarDictamenGas = response.data.strCombustible !== 'GASOLINA';
    const control = this.formDocumentos['dictamenGas'];
    control.setValidators(this.mostrarDictamenGas ? Validators.required : null);
    control.updateValueAndValidity();
  }


  /**
 * Maneja la selección de un archivo PDF en un formulario.
 * - Verifica que el archivo sea de tipo PDF.
 * - Valida que el tamaño no supere los 2MB.
 * - Convierte el archivo a base64 y lo asigna al formulario.
 * - Genera una URL segura para previsualización.
 * - Maneja errores de validación y conversión del archivo.
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

  /**
 * Actualiza el estado de carga de archivos en el formulario.
 * - Cambia el estado de una variable booleana según el archivo cargado.
 * - Permite rastrear qué documentos han sido subidos correctamente.
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


  /*  
     Este código maneja el registro y actualización de trámites para concesionarios.  
     Si es una modificación, obtiene y actualiza los documentos existentes.  
     Si es un nuevo registro, recopila datos de la concesión y del concesionario, valida la información y la envía para su procesamiento.  
     Se implementa una confirmación antes de proceder con el registro o actualización.  
     También maneja la carga de documentos en PDF con validaciones de formato y tamaño.  
     En caso de error, se aplican reintentos automáticos y se muestra un mensaje al usuario.  
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
        bolPersonaFisica: true,
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

  /*  
   Función que filtra y actualiza los documentos a modificar.  
   - Filtra los documentos que no han sido aceptados.  
   - Asigna los archivos correspondientes desde el formulario según su descripción.  
   - Normaliza la lista de documentos para asegurar que los valores sean correctos.  
   - Almacena los documentos procesados en una variable para su uso posterior.  
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


  /*  
     Función para limpiar los formularios siguientes al formulario actual.  
     - No realiza ninguna acción si es una modificación.  
     - Define una lista de formularios en orden de flujo.  
     - Encuentra el índice del formulario actual en la lista.  
     - Restablece todos los formularios que vienen después del formulario actual.  
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

  /*  
   Función para restablecer un formulario específico.  
   - Obtiene el formulario basado en su nombre.  
   - Si el formulario existe, lo resetea a su estado inicial.  
   - Marca el formulario como "pristine" (sin cambios) y "untouched" (sin interacción).  
*/
  private resetFormulario(nombreFormulario: ClavesFormulario) {
    const formulario = this[nombreFormulario];
    if (formulario) {
      formulario.reset();
      formulario.markAsPristine();
      formulario.markAsUntouched();
    }
  }

  /*  
   Función para reiniciar el formulario y restablecer el estado de la interfaz.  
   - Reinicia el stepper para volver al primer paso.  
   - Carga los PDFs predeterminados.  
   - Bloquea la visualización de archivos.  
   - Redirige a la página de "persona-fisica" sin afectar el historial de navegación.  
*/
  reiniciaFormulario() {
    this.stepper.reset();
    this.cargarDefaultPDFs();
    this.bloqueaVerArchivos();
    this.router.navigate(['/persona-fisica'], { skipLocationChange: true });
  }


  /*  
     Función para obtener documentos y asignar los valores correspondientes.  
     - Crea una nueva lista de documentos con identificador y nombre, inicializando el campo de archivo vacío.  
     - Recorre cada documento y asigna el archivo correspondiente según su nombre.  
     - Actualiza la lista de archivos con la nueva información.  
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
            if (this.mostrarDictamenGas) {
              doc.strArchivo = this.formDocumentos['dictamenGas'].value;
            }
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

  /* Función para bloquear la visualización de archivos cargados, reiniciando los indicadores de carga. */
  bloqueaVerArchivos() {
    this.tarjetaCircCargado = false;
    this.dictGasCargado = false;
    this.pagoRefCargado = false;
    this.ineCargado = false;
  }



  /*  
     Función para obtener el primer campo inválido de un formulario.  
     - Recorre los controles del formulario y devuelve el nombre del primer campo inválido.  
     - Si todos los campos son válidos, retorna una cadena vacía.  
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

  /*  
   Manejo de errores generales en solicitudes HTTP.  
   - Si es un error de red, muestra un mensaje de conexión fallida.  
   - Si el servicio no está disponible, informa al usuario.  
   - Si hay un mensaje de error específico del servidor, lo muestra.  
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

  /*  
     Muestra un mensaje de error en una alerta modal.  
     - Personaliza el mensaje de error.  
     - Incluye un botón de confirmación para cerrar la alerta.  
     - Impide que la alerta se cierre haciendo clic fuera de ella.  
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

  /*  
   Carga un PDF predeterminado para cada documento requerido.  
   - Se utiliza un archivo PDF base como plantilla.  
   - Se asigna la misma URL segura a todos los documentos iniciales.  
   - Garantiza que los campos tengan un valor por defecto antes de la carga de archivos reales.  
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
   Muestra un modal con una imagen específica.  
   - Se usa una imagen predeterminada ubicada en los assets.  
   - Se desactiva el botón de cierre para obligar interacción con la alerta.  
   - Se permiten clics fuera del modal para cerrarlo.  
   - Se aplican animaciones de entrada y salida para mejorar la experiencia visual.  
*/
  muestraModalConImagen(campo: string) {
    let img = '/assets/images/LogoTlaxFisica.png';
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
   Obtiene la URL del endpoint correspondiente a cada formulario.  
   - Asigna la URL según el formulario recibido.  
   - Lanza un error si el formulario no tiene un endpoint definido.  
   - Retorna la URL correspondiente o una cadena vacía si no aplica.  
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
   Abre un modal con los términos y condiciones.  
   - Utiliza el componente `TerminosCondicionesComponent`.  
   - Configura el tamaño como extra grande ('xl') y lo centra en la pantalla.  
*/
  openModal() {
    this.modalTerminosCondiciones.open(TerminosCondicionesComponent, { size: 'xl', centered: true });
  }

  /*  
   Función para almacenar un trámite fallido en `localStorage`.  
   - Recupera la lista actual de trámites fallidos.  
   - Agrega el nuevo trámite fallido a la lista.  
   - Guarda la lista actualizada en `localStorage` para su reintento posterior.  
*/
  guardarTramiteFallido(nuevoJsonSmyt: any) {
    let tramitesFallidos = JSON.parse(localStorage.getItem('tramitesFallidos') || '[]');
    tramitesFallidos.push(nuevoJsonSmyt);
    localStorage.setItem('tramitesFallidos', JSON.stringify(tramitesFallidos));
  }

  /*  
     Función para reintentar el envío de trámites fallidos almacenados en `localStorage`.  
     - Recupera la lista de trámites fallidos.  
     - Intenta reenviar cada trámite mediante `registrarTramiteSmyt()`.  
     - Si el envío es exitoso, elimina el trámite de la lista y actualiza `localStorage`.  
     - Si falla, muestra un mensaje de error en la consola.  
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
   Función para iniciar intentos automáticos de reenvío de trámites fallidos.  
   - Ejecuta `reintentarTramitesFallidos()` cada 5 minutos (300,000 ms).  
   - Permite recuperar trámites no enviados sin intervención manual.  
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
}