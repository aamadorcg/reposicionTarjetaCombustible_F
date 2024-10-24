import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appAlphanumeric]'
})
export class AlphanumericDirective {

  private regex: RegExp = new RegExp(/^[A-Z0-9]*$/);

  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event'])
  onInput(): void {
    const input = this.el.nativeElement as HTMLInputElement;
    let filteredValue = input.value.toUpperCase().split('').filter(char => this.regex.test(char)).join('');
    if (filteredValue !== input.value) {
      input.value = filteredValue;
      input.dispatchEvent(new Event('input'));
    }
  }
}
