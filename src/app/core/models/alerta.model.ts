export interface MostrarAlertaOpciones {
  message: string;
  icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
  imageUrl?: string;
  showConfirmButton?: boolean;
  confirmButtonColor?: string;
  confirmButtonText?: string;
  showDenyButton?: boolean;
  denyButtonText?: string;
  showCancelButton?: boolean;
  cancelButtonText?: string;
  showCloseButton?: boolean;
  allowOutsideClick?: boolean;
  showClass?: {
    popup?: string;
  };
  hideClass?: {
    popup?: string;
  };
}
