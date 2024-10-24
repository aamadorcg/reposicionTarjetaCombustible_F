import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { AlphanumericDirective } from '../core/directives/alphanumeric.directive';
import { UppercaseDirective } from '../core/directives/uppercase.directive';
import { CurpDirective } from '../core/directives/curp.directive';
import { NumericDirective } from '../core/directives/numeric.directive';
import { MailDirective } from '../core/directives/mail.directive';

@NgModule({
  declarations: [
    AlphanumericDirective,
    UppercaseDirective,
    CurpDirective,
    NumericDirective,
    MailDirective
  ],
  imports: [
    CommonModule,
    MatIconModule,
    MatStepperModule,
    MatButtonModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatTooltipModule,
    MatRippleModule
  ],
  exports: [
    MatIconModule,
    MatStepperModule,
    MatButtonModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatTooltipModule,
    AlphanumericDirective,
    UppercaseDirective,
    CurpDirective,
    NumericDirective,
    MailDirective
  ]
})
export class SharedModule { }
