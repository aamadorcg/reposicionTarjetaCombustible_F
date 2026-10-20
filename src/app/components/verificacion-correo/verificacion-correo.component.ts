import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { AlertaUtility } from 'src/app/shared/utilities/alerta';
import { COLOR_CONFIRMAR } from 'src/app/shared/constants/colores';
import { TipoPersona, VerificacionCorreoService } from 'src/app/services/verificacion-correo.service';

@Component({
     selector: 'app-verificacion-correo',
     templateUrl: './verificacion-correo.component.html',
     styleUrls: ['./verificacion-correo.component.css']
})
export class VerificacionCorreoComponent implements OnInit, OnDestroy {
     tipo: TipoPersona = 'fisica';
     solicitudId = '';
     segundosRestantes = 0;
     vencimiento = 0;
     procesando = false;
     mensaje = '';
     error = '';
     private reloj?: Subscription;
     private rutaSubscription?: Subscription;
     correoForm = this.fb.group({ correo: ['', [Validators.required, Validators.email]] });
     codigoForm = this.fb.group({ codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
     constructor(private fb: FormBuilder, private route: ActivatedRoute,
          private router: Router, private service: VerificacionCorreoService, private alertaUtility: AlertaUtility) { }
     ngOnInit(): void {
          this.rutaSubscription = this.route.paramMap.subscribe(params => {
               this.tipo = params.get('tipo') === 'moral' ? 'moral' : 'fisica';
               this.reiniciarVerificacion();
          });
     }

     private reiniciarVerificacion(): void {
          this.reloj?.unsubscribe();
          this.service.limpiar();
          this.solicitudId = '';
          this.segundosRestantes = 0;
          this.vencimiento = 0;
          this.procesando = false;
          this.mensaje = '';
          this.error = '';
          this.correoForm.reset();
          this.codigoForm.reset();
     }
     get tiempo(): string {
          const m = Math.floor(this.segundosRestantes / 60);
          return `${String(m).padStart(2, '0')}:${String(this.segundosRestantes % 60).padStart(2, '0')}`;
     }
     get correo(): string { return (this.correoForm.value.correo ?? '').trim().toLowerCase(); }
     solicitar(): void {

          this.error = '';
          this.mensaje = '';

          if (this.correoForm.invalid || this.procesando) {
               this.correoForm.markAllAsTouched();

               if (this.correoForm.invalid) {
                    this.mostrarAlerta(
                         'Por favor, ingresa un correo electrónico válido.',
                         'warning'
                    );
               }

               return;
          }

          this.procesando = true;

          this.service.solicitar(this.correo, this.tipo).subscribe({

               next: resp => {

                    this.solicitudId = resp.solicitudId;
                    this.codigoForm.reset();

                    this.vencimiento = new Date(resp.expiraEn).getTime();
                    this.iniciarReloj();

                    this.procesando = false;

                    this.mostrarAlerta(
                         `Se ha enviado un código de verificación de 6 dígitos al correo:
         <br><br>
         <strong>${this.correo}</strong>
         <br><br>
         Tienes 5 minutos para ingresar el código.`,
                         'success'
                    );

               },

               error: (err: HttpErrorResponse) => {

                    this.procesando = false;

                    this.mostrarAlerta(
                         this.errorHttp(err),
                         'error'
                    );

               }

          });

     }
     verificar(): void {

          this.error = '';

          if (
               this.codigoForm.invalid ||
               !this.solicitudId ||
               !this.segundosRestantes ||
               this.procesando
          ) {

               this.codigoForm.markAllAsTouched();

               if (!this.segundosRestantes) {

                    this.mostrarAlerta(
                         'El código de verificación ha vencido. Solicita uno nuevo.',
                         'warning'
                    );

               } else {

                    this.mostrarAlerta(
                         'Por favor, ingresa el código de verificación de 6 dígitos.',
                         'warning'
                    );

               }

               return;
          }

          this.procesando = true;

          this.service.validar(
               this.solicitudId,
               this.codigoForm.value.codigo!
          ).subscribe({

               next: () => {

                    this.reloj?.unsubscribe();

                    this.mostrarAlerta(
                         `Tu correo electrónico ha sido verificado correctamente.
         <br><br>
         <strong>${this.correo}</strong>
         <br><br>
         Ahora puedes continuar con tu trámite.`,
                         'success'
                    ).then(() => {

                         this.router.navigateByUrl(
                              this.tipo === 'fisica'
                                   ? '/persona-fisica'
                                   : '/persona-moral'
                         );

                    });

               },

               error: (err: HttpErrorResponse) => {

                    this.procesando = false;

                    this.mostrarAlerta(
                         this.errorHttp(err),
                         'error'
                    );

               }

          });

     }
     cambiarCorreo(): void {
          this.reloj?.unsubscribe(); this.solicitudId = ''; this.error = ''; this.mensaje = '';
          this.segundosRestantes = 0; this.codigoForm.reset();
     }
     private iniciarReloj(): void {
          this.reloj?.unsubscribe();
          const actualizar = () => {
               this.segundosRestantes = Math.max(0, Math.ceil((this.vencimiento - Date.now()) / 1000));
               if (!this.segundosRestantes) this.reloj?.unsubscribe();
          };
          actualizar(); this.reloj = interval(1000).subscribe(actualizar);
     }
     private errorHttp(err: HttpErrorResponse): string {
          if (err.status === 429) return 'Demasiados intentos. Vuelve a intentarlo más tarde.';
          if (err.status === 410) return 'El código ha vencido. Solicita uno nuevo.';
          if (err.status === 400 || err.status === 401) return 'Código incorrecto, inválido o ya utilizado.';
          return 'No fue posible realizar la operación. Inténtalo nuevamente.';
     }
     ngOnDestroy(): void {
          this.reloj?.unsubscribe();
          this.rutaSubscription?.unsubscribe();
     }

     private mostrarAlerta(
          mensaje: string,
          tipo: 'success' | 'error' | 'warning' | 'info'
     ): Promise<any> {

          return this.alertaUtility.mostrarAlerta({
               message: mensaje,
               icon: tipo,
               showConfirmButton: true,
               confirmButtonColor: COLOR_CONFIRMAR,
               confirmButtonText: 'Aceptar',
               showCloseButton: false,
               allowOutsideClick: true
          });
     }
}