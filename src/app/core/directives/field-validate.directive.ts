import { Directive, Input, ElementRef, Renderer2, HostListener, OnInit } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Directive({
  selector: '[appFieldValidate]'
})
export class FieldValidateDirective implements OnInit {
  @Input('appFieldValidate') control!: AbstractControl | null;
  @Input() required: boolean = false;
  @Input() minlength: number = 0;
  @Input() maxlength: number = 0;
  @Input() pattern: string = ''; 
  @Input() validateUniqueDigits: boolean = false; 

  private errorContainer!: HTMLElement;

  constructor(private el: ElementRef, private renderer: Renderer2) { }

  ngOnInit(): void {
    if (!this.control) return;
    this.crearErrorContainer();
    this.control.statusChanges?.subscribe(() => this.actualizarEstado());
    this.control.valueChanges?.subscribe(() => this.actualizarEstado());
    this.actualizarEstado();
  }

  @HostListener('blur') onBlur() {
    if (this.control && !this.control.dirty) {
      this.control.markAsTouched();
      this.actualizarEstado();
    }
  }

  @HostListener('document:submit', ['$event'])
  onSubmit() {
    if (this.control) {
      this.actualizarEstado();
    }
  }

  private crearErrorContainer(): void {
    this.errorContainer = this.renderer.createElement('div');
    this.renderer.addClass(this.errorContainer, 'invalid-feedback');
    this.renderer.setStyle(this.errorContainer, 'display', 'none');

    const parent = this.el.nativeElement.parentNode;
    this.renderer.appendChild(parent, this.errorContainer);
  }

  private actualizarEstado(): void {
    if (!this.control) return;

    const element = this.el.nativeElement;
    const touchedOrDirty = this.control.touched || this.control.dirty;
    const errors = this.control.errors;

    if (errors && touchedOrDirty) {
      this.renderer.addClass(element, 'is-invalid');
      this.renderer.removeClass(element, 'is-valid');
      this.mostrarErrores(errors);
    } else if (this.control.valid && touchedOrDirty) {
      this.renderer.addClass(element, 'is-valid');
      this.renderer.removeClass(element, 'is-invalid');
      this.limpiarErrores();
    } else {
      this.renderer.removeClass(element, 'is-valid');
      this.renderer.removeClass(element, 'is-invalid');
      this.limpiarErrores();
    }
  }

  private mostrarErrores(errors: any): void {
    let errorMessage = '';

    if (errors['required'] && this.required) errorMessage = 'Campo obligatorio';
    if (errors['minlength'] && this.minlength > 0) errorMessage = `Debe tener al menos ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength'] && this.maxlength > 0) errorMessage = `No puede tener más de ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['pattern'] && this.pattern) errorMessage = 'Formato no válido'; 
    if (errors['uniqueDigits']) errorMessage = 'El número no puede contener todos los dígitos iguales';

    this.errorContainer.innerText = errorMessage;
    this.renderer.setStyle(this.errorContainer, 'display', 'block');
  }

  private limpiarErrores(): void {
    this.errorContainer.innerText = '';
    this.renderer.setStyle(this.errorContainer, 'display', 'none');
  }
}