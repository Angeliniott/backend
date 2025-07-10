import pandas as pd
import random
import os

def agregar_contrasenas_excel():
    # Usar el archivo Book1.xlsx en la misma carpeta
    ruta_entrada = os.path.join(os.path.dirname(__file__), 'Book1.xlsx')
    ruta_salida = os.path.join(os.path.dirname(__file__), 'Book1_con_contrasenas.xlsx')

    # Leer el archivo Excel
    df = pd.read_excel(ruta_entrada)

    # Verificar que hay al menos una columna
    if df.shape[1] < 1:
        raise ValueError("El archivo debe tener al menos una columna de correos.")

    # Generar contraseñas de 4 dígitos para cada correo
    df['Contraseña'] = [str(random.randint(1000, 9999)) for _ in range(len(df))]

    # Guardar el nuevo archivo Excel
    df.to_excel(ruta_salida, index=False)

if __name__ == "__main__":
    agregar_contrasenas_excel()