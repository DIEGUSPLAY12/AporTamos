from fastapi import FastAPI

# Crea la instancia de la aplicación
app = FastAPI()

# Define tu primera ruta (endpoint)
@app.get("/")
def leer_raiz():
    return {"mensaje": "¡Hola, FastAPI!"}