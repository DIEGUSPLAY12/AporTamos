# AporTamos 🏠✨

AporTamos es una aplicación móvil diseñada para gestionar las tareas del hogar de manera justa y divertida a través de la **gamificación**. Ayuda a los convivientes a organizar sus responsabilidades, comunicarse y mantener el hogar en orden mientras suman puntos y obtienen recompensas. 

Desarrollada con **React Native + Expo** en el Frontend, y apoyada por un Backend robusto y asíncrono con **FastAPI** y **Supabase** (Auth, Storage, Realtime, Database).

## 🚀 Características Principales

* **Gestión de Tareas Compartida**: Asigna, prioriza y completa tareas (diarias, semanales, etc.).
* **Gamificación**: Sistema de puntos para premiar el esfuerzo y mantener la motivación.
* **Sistema de Hogares (Households)**: Crea un hogar mediante un código de invitación y colabora con otros usuarios.
* **Chat en Tiempo Real**: Comunicación integrada dentro del hogar para coordinar tareas y actividades.
* **Estadísticas (Stats)**: Visualiza quién hace qué y mantén un registro de aportes.

## 🛠️ Stack Tecnológico

* **Frontend**: React 19, React Native, Expo, Expo Router (Enrutamiento basado en archivos).
* **Backend**: FastAPI (Python).
* **Base de Datos y Auth**: Supabase.

---

## 💻 Entorno de Desarrollo Local

Para levantar el proyecto de forma local, necesitas tener instalado [Node.js](https://nodejs.org/), [Python 3.x](https://www.python.org/) y conocimientos básicos de manejo de terminal.

### 1. Configurar el Backend (FastAPI)

1. Abre un terminal y dirígete a la carpeta del backend:
   ```bash
   cd AporTamos-Backend
   ```
2. Crea de un entorno virtual para aislar las dependencias:
   ```bash
   python -m venv venv
   ```
3. Activa el entorno virtual:
   * **macOS / Linux:** `source venv/bin/activate`
   * **Windows:** `venv\Scripts\activate`
4. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
5. Configura las variables de entorno duplicando el archivo `.env.example` y renombrándolo a `.env`. (Modifica las variables si es necesario).
6. Inicia el servidor de desarrollo:
   ```bash
   uvicorn main:app --reload
   ```
   *La API estará corriendo por defecto en `http://127.0.0.1:8000`.*

### 2. Configurar el Frontend (React Native + Expo)

1. Abre otro terminal y dirígete a la carpeta del frontend:
   ```bash
   cd AporTamos-Frontend
   ```
2. Instala las dependencias de NPM (asegúrate de usar npm o yarn):
   ```bash
   npm install
   ```
3. Configura las variables de entorno duplicando el archivo `.env.example` y renombrándolo a `.env`. Añade aquí tus credenciales de Supabase (`EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`) y la URL de tu API local si hace falta.
4. Levanta el proyecto con Expo:
   ```bash
   npx expo start
   ```
5. Puedes escanear el código QR con la app **Expo Go** en tu dispositivo móvil (disponible para iOS y Android), o presionar `a` para abrir un emulador Android (o `i` para abrir un simulador de iOS).

---

## 📦 Construir la aplicación (Build para Descarga)

Para generar la app y poder descargarla (como APK en Android, por ejemplo), se utiliza **EAS Build** (Expo Application Services).

### Preparación
Instala el CLI de EAS de manera global si aún no lo tienes:
```bash
npm install -g eas-cli
```
Luego, inicia sesión (necesitas una cuenta en [expo.dev](https://expo.dev/)):
```bash
eas login
```

### Construir para Android (.apk)

La forma más sencilla de obtener una aplicación instalable de prueba es construir un APK con el perfil "preview" de Expo.

1. Dirígete a la carpeta Frontend: 
   ```bash
   cd AporTamos-Frontend
   ```
2. Ejecuta el comando de construcción:
   ```bash
   eas build -p android --profile preview
   ```
3. Deja que se suba y se construya en los servidores de Expo. Al finalizar, la terminal te indicará la URL (y un QR) para que **descargues el archivo `.apk` y lo instales directamente en tu móvil**.

### Construir para iOS (.ipa)

*Para iOS se requiere estar inscrito en el Apple Developer Program para obtener el perfil de firmado (Provisioning Profile) que permite instalar versiones previas en dispositivos.*

```bash
eas build -p ios --profile preview
```
EAS te pedirá iniciar sesión con tu Apple ID y automatizará el firmado y registro del dispositivo en el portal de Apple.