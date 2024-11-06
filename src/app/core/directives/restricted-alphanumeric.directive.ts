import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appRestrictedAlphanumeric]'
})
export class RestrictedAlphanumericDirective {

  private readonly regex: RegExp = /^[A-Z0-9]*$/;
  private readonly excludedChars: Set<string> = new Set(['O', 'I', 'Ñ']);

  constructor(private readonly el: ElementRef) { }

  @HostListener('input', ['$event'])
  onInput(): void {
    const input = this.el.nativeElement as HTMLInputElement;

    const filteredValue = input.value
      .toUpperCase()
      .split('')
      .filter(char => this.regex.test(char) && !this.excludedChars.has(char))
      .join('');

    if (filteredValue !== input.value) {
      input.value = filteredValue;
      input.dispatchEvent(new Event('input'));
    }
  }
}