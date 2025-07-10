import pandas as pd
import random
import os
import hashlib

def agregar_contrasenas_excel():
    # Usar el archivo Book1.xlsx en la misma carpeta
    ruta_entrada = os.path.join(os.path.dirname(__file__), 'Book1.xlsx')
    ruta_salida = os.path.join(os.path.dirname(__file__), 'Book1_con_contrasenas.xlsx')

    # Leer el archivo Excel
    df = pd.read_excel(ruta_entrada)

    # Si ya existen las otras columnas, no las modifica, solo agrega la columna hash
    # Generar la columna de contraseña hasheada (usando SHA-256)
    df['Contraseña_Hash'] = df['Contraseña'].apply(lambda x: hashlib.sha256(x.encode()).hexdigest())

    # Guardar el nuevo archivo Excel
    df.to_excel(ruta_salida, index=False)

if __name__ == "__main__":
    agregar_contrasenas_excel()