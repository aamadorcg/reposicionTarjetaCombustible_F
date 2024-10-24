import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { COLOR_CONFIRMAR } from 'src/app/shared/constants/colores';
import { AlertaUtility } from 'src/app/shared/utilities/alerta';
import { convertirPDFbase64 } from 'src/app/shared/utilities/convertirPDFbase64';

@Component({
  selector: 'app-card-pdf',
  templateUrl: './card-pdf.component.html',
  styleUrls: ['./card-pdf.component.css']
})

export class CardPdfComponent implements OnInit {
  @Input() pdfUrl: SafeResourceUrl = '' ;
  @Input() title: string = '';
  @Input() controlName: string = '';
  @Input() formGroup: FormGroup = new FormGroup({});
  @Input() defaultPdfUrl: string = '';
  @Input() esPersonaFisica: boolean = true;
  @Input() documentChecked: boolean = false;
  @Input() esModificado: boolean = false;

  public isDefaultPdf: boolean = true;
  
  constructor(
    private alertaUtility: AlertaUtility,
    private sanitizer: DomSanitizer,
  ){
  }

  ngOnInit(): void {
    if (!this.pdfUrl) {
      this.pdfUrl = this.defaultPdfUrl;
    }
    if(this.esModificado){
      this.isDefaultPdf = false;
    }
  }

  pdfSeleccionado(event: any) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      const fileType = file.type;
      if (fileType !== 'application/pdf') {
        // Mostrar alerta de error
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
        const controlNameValue = this.controlName ?? 'asdas';
        this.formGroup.get(controlNameValue)?.patchValue(base64);
        const fileURL = URL.createObjectURL(file);
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(fileURL);
        this.isDefaultPdf = false; 
      }).catch(() => {
        this.muestraError('Error al procesar el archivo PDF.');
        input.value = '';
      });
    }
  }

  muestraError(message: string) {
    this.alertaUtility.mostrarAlerta({
      message,
      icon: 'error',
      showConfirmButton: true,
      confirmButtonColor: COLOR_CONFIRMAR,
      confirmButtonText: 'Confirmar',
      showCloseButton: false,
      allowOutsideClick: true
    });
  }
}