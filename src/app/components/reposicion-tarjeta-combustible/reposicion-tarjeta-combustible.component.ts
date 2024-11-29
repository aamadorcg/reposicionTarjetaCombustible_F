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
import Swal from 'sweetalert2';
import { RespuestaGenerica } from 'src/app/core/models/respuesta.generica.model';


type ClavesFormulario = 'datosConcesionForm' | 'datosConcesionarioForm' | 'documentosUnidadForm';

@Component({
  selector: 'app-reposicion-tarjeta',
  templateUrl: './reposicion-tarjeta-combustible.component.html',
  styleUrls: ['./reposicion-tarjeta-combustible.component.css'],
})

export class ReposicionTarjetaCombustibleComponent {

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

  RFC_FISICA_PATTERN = '^([A-ZÑ&]{4})(\\d{6})([A-Z\\d]{3})$';
  RFC_MORAL_PATTERN = '^([A-ZÑ&]{3})(\\d{6})([A-Z\\d]{3})$';
  esPersonaFisica = false;
  esPersonaMoral = false;
  buscaRFC = false;
  tarjetaCircCargado: boolean = false;
  dictGasCargado: boolean = false;
  pagoRefCargado: boolean = false;
  ineCargado: boolean = false;
  polizaCargado: boolean = false;
  idTramiteRepoTarjetaCombustible: number = 12;
  idTramite = "";


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
  ) { }

  ngOnInit() {
    this.inicializarFormularios();
    this.detectarTipoTramite();
    this.configurarRFCFisicaMoral();
    this.cargarDefaultPDFs();
    this.obtenerDocumentosTramite();
    this.observarFormularios();
  }

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

  obtenUrlSeguro(base64: string): SafeResourceUrl {
    if (!base64) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('assets/documents/subirArchivo.pdf');
    }
    const contentType = 'application/pdf';
    const blob = this.creaBlobDeBase64(base64.split(',')[1], contentType);
    const url = URL.createObjectURL(blob);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  creaBlobDeBase64(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);//Decodifica
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

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

  private inicializarFormularios() {
    this.datosConcesionForm = this.formBuilder.group({
      intIdPlaca: 0,
      strNiv: ['', Validators.required],
      strPlaca: ['', Validators.required],
      strCveVeh: [{ value: '', disabled: true }],
      strMotor: [{ value: '', disabled: true }],
      strMarca: [{ value: '', disabled: true }],
      intModelo: [{ value: '', disabled: true }],
      strTipoVeh: [{ value: '', disabled: true }],
      intCapacidad: [{ value: '', disabled: true }],
      intCilindros: [{ value: '', disabled: true }],
      strCombustible: [{ value: '', disabled: true }],
      intRefrendo: [{ value: '', disabled: true }],
      strNoTarjeta: [{ value: '', disabled: true }]
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
        Validators.pattern(/^\d+$/),
        this.validaNoTodosIguales.bind(this)
      ]
      ],
      strEmail: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      strTelefonoContacto: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.pattern(/^\d+$/),
        this.validaNoTodosIguales.bind(this)
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

  validaNoTodosIguales(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value || value.length !== 10) {
      return null;
    }
    const allCharactersAreSame = /^(\d)\1*$/.test(value);
    return allCharactersAreSame ? { noTodosIguales: true } : null;
  }

  rfcValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const esPersonaFisica = this.esPersonaFisica;
      const esPersonaMoral = this.esPersonaMoral;

      const rfcValue = control.value;

      if (esPersonaFisica) {
        if (!rfcValue || rfcValue.length !== 13 || !new RegExp(this.RFC_FISICA_PATTERN).test(rfcValue)) {
          return { rfcInvalido: true };
        }
      } else if (esPersonaMoral) {
        if (!rfcValue || rfcValue.length !== 12 || !new RegExp(this.RFC_MORAL_PATTERN).test(rfcValue)) {
          return { rfcInvalido: true };
        }
      }
      return null;
    };
  }

  get rfcPlaceholder(): string {
    return this.esPersonaFisica ? 'R.F.C. LLLL000000AAA' : 'R.F.C. LLL000000AAA';
  }

  get rfcTooltip(): string {
    return this.esPersonaFisica
      ? 'L = Letra, 0 = Número, A = Letra ó Número, Formato válido: LLLL000000AAA'
      : 'L = Letra, 0 = Número, A = Letra ó Número, Formato válido: LLL000000AAA';
  }

  configurarRFCFisicaMoral() {
    this.activatedRoute.data.subscribe((param: any) => {
      if (param.tipo === 'F') {
        this.formConcesionario['strRfc'].setValidators([
          Validators.required,
          Validators.minLength(13),
          Validators.maxLength(13),
          Validators.pattern(this.RFC_FISICA_PATTERN)
        ]);
        this.datosConcesionarioForm.get('strRfc')?.updateValueAndValidity();
        this.esPersonaFisica = true;
      } else if (param.tipo === 'M') {
        this.formConcesionario['strRfc'].setValidators([
          Validators.required,
          Validators.minLength(12),
          Validators.maxLength(12),
          Validators.pattern(this.RFC_MORAL_PATTERN)
        ]);
        this.datosConcesionarioForm.get('strRfc')?.updateValueAndValidity();
        this.esPersonaMoral = true;
      }
    });
  }

  obtenerDocumentosTramite() {
    let valores = {
      intIdTipoTramite: this.idTramiteRepoTarjetaCombustible
    }
    this.servicios.obtenerDocumentosTramite(valores).subscribe({
      next: (value: any) => {
        this.listaArchivos = value.data
        //console.log(this.listaArchivos);
      },
      error: (err: HttpErrorResponse) => {
        this.muestraErrorGeneral(err);
      }
    });
  }

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
        if ((strRfc && strRfc.length === 13 && this.esPersonaFisica && this.formConcesionario['strRfc'].valid) ||
          (strRfc && strRfc.length === 12 && this.esPersonaMoral && this.formConcesionario['strRfc'].valid)) {
          this.formularioCompleto = true;
          this.cargarDatosFormulario(this.datosConcesionarioForm, 'datosConcesionarioForm', false);
        }
      }, 0);
    });
  }

  ngAfterViewInit() {
    this.validaCamposConAutocomplete();
  }

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
          esPersonaFisica: this.esPersonaFisica,
          intIdTipoTramite: this.idTramiteRepoTarjetaCombustible
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
            message = 'El servicio no está disponible en este momento.<br> Intente nuevamente más tarde.';
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
   * REGISTRO DE TRÁMITE
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
        strPlaca: this.formConcesion['strPlaca'].value,
        strNiv: this.formConcesion['strNiv'].value,
        strRfc: this.formConcesionario['strRfc'].value,
        intIdPlaca: this.formConcesion['intIdPlaca'].value,
        strEmail: this.formConcesionario['strEmail'].value,
        strTelefonoContacto: this.formConcesionario['strTelefonoContacto'].value,
        strTelefonoRepresentante: this.formConcesionario['strTelefonoRepresentante'].value,
        intIdTipoTramite: this.idTramiteRepoTarjetaCombustible,
        documentacionVo: this.listaArchivos
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
                message = 'El servicio no está disponible en este momento.<br> Intente nuevamente más tarde.';
              } else {
                message = err.error.strMessage;
              }
              this.cargarSpinner = false;
              this.muestraError(message);
            },
          });
        } else {
          this.servicios.registrarTramite(json).subscribe({
            next: (value: any) => {
              this.cargarSpinner = false;
              Swal.fire({
                title: '¡Éxito!',
                html: '<p>Estimado usuario, nos complace informarle que la información ha sido registrada exitosamente.</p><p> En breve, será redirigido a la pasarela de pagos del <strong>Gobierno del Estado de Tlaxcala.</strong></p> Gracias<br>',
                icon: 'success',
                showConfirmButton: true,
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#A11A5C',
                allowOutsideClick: true,
                background: '#fff url("/assets/images/logoTlaxC2.png") center/cover no-repeat'
              }).then(result => {
                if (result.isConfirmed) {
                  if (value && value.data) {
                    this.reiniciaFormulario();
                    urlPasarela = value.data.strUrlPasarela;
                    if (urlPasarela) {
                      window.location.href = urlPasarela;
                    }
                  } else {
                    this.reiniciaFormulario();
                    console.error('La URL de la pasarela no se encontró en la respuesta del API');
                  }
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
   * REINICIO/LIMPIEZA FORMULARIO
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

  private resetFormulario(nombreFormulario: ClavesFormulario) {
    const formulario = this[nombreFormulario];
    if (formulario) {
      formulario.reset();
      formulario.markAsPristine();
      formulario.markAsUntouched();
    }
  }

  reiniciaFormulario() {
    this.stepper.reset();
    this.cargarDefaultPDFs();
    this.bloqueaVerArchivos();
    if (this.esPersonaFisica) {
      this.router.navigate(['/persona-fisica'], { skipLocationChange: true });
    } else if (this.esPersonaMoral) {
      this.router.navigate(['/persona-moral'], { skipLocationChange: true });
    }

  }

  /*
   * CONTROL ARCHIVOS
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

  bloqueaVerArchivos() {
    this.tarjetaCircCargado = false;
    this.dictGasCargado = false;
    this.pagoRefCargado = false;
    this.ineCargado = false;
  }


  /**
   * UTILIDADES
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

  muestraErrorGeneral(err: HttpErrorResponse) {
    let message: string;
    if (err.error instanceof ErrorEvent) {
      message = 'Ocurrió un problema con la conexión de red. Por favor, verifica tu conexión a internet.';
    } else if (err.status === 0) {
      message = 'El servicio no está disponible en este momento.<br> Intente nuevamente más tarde.';
    } else {
      message = err.error.strMessage;
    }
    this.muestraError(message);
  }

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

  muestraModalConImagen(campo: string) {
    let img = '';
    if (campo === 'strRfc' && this.esPersonaFisica) {
      img = '/assets/images/LogoTlaxFisica.png';
    } else {
      img = '/assets/images/LogoTlaxMoral.png';
    }
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

  openModal() {
    this.modalTerminosCondiciones.open(TerminosCondicionesComponent, { size: 'xl', centered: true });
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