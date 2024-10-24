import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appNumeric]'
})
export class NumericDirective {

  constructor(private control: NgControl) { }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const inputValue = inputElement.value;

    // Remueve cualquier caracter que no sea número
    const numericValue = inputValue.replace(/[^0-9]/g, '');

    // Actualiza el valor solo si ha cambiado
    if (inputValue !== numericValue) {
      // Actualiza el control de formulario si estás usando Angular Forms
      this.control.control?.setValue(numericValue);
    }
  }
}
