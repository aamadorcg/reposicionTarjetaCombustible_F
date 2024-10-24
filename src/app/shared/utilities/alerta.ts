import { Injectable } from '@angular/core';
import { MostrarAlertaOpciones } from 'src/app/core/models/alerta.model';
import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class AlertaUtility {
  /**
   * Muestra una alerta utilizando SweetAlert2.
   *
   * @param message - El mensaje que se mostrará en la alerta. Puede contener HTML para formateo avanzado.
   * @param icon - El icono que se mostrará en la alerta. Puede ser uno de los siguientes valores:
   *               'success', 'error', 'warning', 'info'. Si no se proporciona, se usará la imagen.
   * @param imageUrl - La URL de la imagen que se mostrará en la alerta. Si se proporciona, se ignora el ícono.
   * @param showConfirmButton - Booleano que indica si se debe mostrar el botón de confirmación.
   * @param confirmButtonColor - El color del botón de confirmación en formato hexadecimal. El valor predeterminado es '#A11A5C'.
   * @param confirmButtonText - El texto que se mostrará en el botón de confirmación. El valor predeterminado es 'Confirmar'.
   * @param showDenyButton - Booleano que indica si se debe mostrar el botón de 'Deny'.
   * @param denyButtonText - El texto que se mostrará en el botón de 'Deny'.
   * @param showCancelButton - Booleano que indica si se debe mostrar el botón de 'Cancel'.
   * @param cancelButtonText - El texto que se mostrará en el botón de 'Cancel'.
   *
   * @returns Una promesa que se resuelve en `true` si se confirmó la acción, y `false` en caso contrario.
   */
  mostrarAlerta(options: MostrarAlertaOpciones): Promise<SweetAlertResult<any>> {
    const {
      message,
      icon,
      imageUrl,
      showConfirmButton = false,
      confirmButtonColor = '#A11A5C',
      confirmButtonText = 'Confirmar',
      showDenyButton = false,
      denyButtonText = 'Deny',
      showCancelButton = false,
      cancelButtonText = 'Cancel',
      showCloseButton = true,
      allowOutsideClick = false,
      showClass,
      hideClass
    } = options;

    const config: SweetAlertOptions = {
      html: message,
      showConfirmButton: showConfirmButton,
      confirmButtonColor: confirmButtonColor,
      confirmButtonText: confirmButtonText,
      showDenyButton: showDenyButton,
      denyButtonText: denyButtonText,
      showCancelButton: showCancelButton,
      cancelButtonText: cancelButtonText,
      showCloseButton,
      allowOutsideClick,
      showClass: showClass || {},
      hideClass: hideClass || {}
    };

    if (imageUrl) {
      config.imageUrl = imageUrl;
      config.imageWidth = '95%';
      config.imageAlt = 'Custom image';
      config.background = 'rgb(66, 43, 124)';
      config.width = '60%';
    } else if (icon) {
      config.icon = icon;
    }
    return Swal.fire(config);
  }
}
