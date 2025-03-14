import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from './shared/shared.module';
import { HttpClientModule } from '@angular/common/http';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { NavComponent } from './components/nav/nav.component';
import { FooterComponent } from './components/footer/footer.component';
import { TerminosCondicionesComponent } from './components/terminos-condiciones/terminos-condiciones.component';
import { CardPdfComponent } from './components/card-pdf/card-pdf.component';
import { RestrictedAlphanumericDirective } from './core/directives/restricted-alphanumeric.directive';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { PersonaFisicaComponent } from './components/persona-fisica/persona-fisica.component';
import { PersonaMoralComponent } from './components/persona-moral/persona-moral.component';
import { FieldValidateDirective } from './core/directives/field-validate.directive';

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    FooterComponent,
    TerminosCondicionesComponent,
    CardPdfComponent,
    RestrictedAlphanumericDirective,
    NotFoundComponent,
    PersonaFisicaComponent,
    PersonaMoralComponent,
    FieldValidateDirective
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule
  ],
  providers: [
    {
      provide: LocationStrategy, useClass: HashLocationStrategy
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
