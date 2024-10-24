import { Directive, ElementRef, HostListener } from '@angular/core';
import {  Validator, FormControl } from '@angular/forms';

@Directive({
  selector: '[appCurp]'
})
export class CurpDirective {
  constructor(private elementRef: ElementRef) { }
  validate(control: FormControl): { [key: string]: any } {
    const curpPattern = /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1])[HM]{1}(AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE){1}[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]{1}[0-9]{1}$/;
    const isValid = curpPattern.test(control.value);
    return isValid ? {} : { 'curp': true };
  }
  @HostListener('input', ['$event.target.value'])
  onInput(value: string) {
    const isCurpValid = !this.validate(new FormControl(value))['curp'];
    if (isCurpValid) {
      this.elementRef.nativeElement.classList.remove('invalid-data');
    } else {
      this.elementRef.nativeElement.classList.add('invalid-data');
    }
  }
}