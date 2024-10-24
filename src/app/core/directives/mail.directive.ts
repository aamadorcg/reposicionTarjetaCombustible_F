import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appMail]'
})
export class MailDirective {

  private regex: RegExp = new RegExp(/^[a-zA-Z0-9._%+-@]+$/);
  
  @HostListener('input', ['$event']) onInputChange(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    let currentValue = input.value;

    if (!this.regex.test(currentValue)) {
      input.value = currentValue.replace(/[^a-zA-Z0-9._%+-@]/g, '');
      event.preventDefault();
    }
  }
}