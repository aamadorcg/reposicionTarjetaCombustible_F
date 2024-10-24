export function convertirPDFbase64(archivo: File): Promise<string> {
     return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
               if (reader.result) {
                    resolve(reader.result as string);
               } else {
                    reject(new Error('Ocurrió un error al leer el archivo como base64.'));
               }
          };

          reader.onerror = (evento) => {
               const error = evento.target as FileReader;
               reject(new Error(`Ocurrió un error con el FileReader: ${error.error?.message ?? 'Error desconocido'}`));
          };

          reader.readAsDataURL(archivo);
     });
}
