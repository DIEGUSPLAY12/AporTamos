# AporTamos

Aplicación móvil (React Native + Expo) para gestión de tareas del hogar con gamificación.

## Contexto del proyecto

**Constitución**: Lee siempre `.specify/memory/constitution.md` al inicio de cada sesión. Contiene los principios no-negociables del proyecto.

**Feature activa**: La feature activa se encuentra en `.specify/feature.json`. Actualmente apunta a `specs/001-household-tasks/`.

## Stack tecnológico (BLOQUEADO)

- **Frontend**: React 19.1.0, React Native 0.81.5, Expo ~54.0.33, Expo Router ~6.0.23
- **Backend**: FastAPI, Supabase (auth, storage, realtime)
- **Plataformas**: iOS, Android, Web (React Native Web)

## Principios (resumen de la constitución)

1. **Código limpio** — Variables autodocumentadas, funciones de propósito único
2. **UX simple** — Sin features innecesarias, sin complejidad de UI injustificada
3. **Responsive** — Mobile-first, soporte de todos los viewports
4. **Dependencias mínimas** — Justificar cada dependencia nueva
5. **Sin testing automático** — No se requieren tests unitarios, de integración ni E2E
6. **Commits directos a main** — Sin feature branches; todo va a main

## Flujo SpecKit (SDD)

Este proyecto usa Specification-Driven Development con SpecKit. Los comandos disponibles son:

| Comando | Propósito |
|---------|-----------|
| `/speckit-specify` | Crear o actualizar la especificación de una feature |
| `/speckit-clarify` | Reducir ambigüedades en la spec activa (máx. 5 preguntas) |
| `/speckit-plan` | Generar el plan técnico (research, data-model, contracts) |
| `/speckit-tasks` | Generar tasks.md con tareas ordenadas por prioridad |
| `/speckit-analyze` | Análisis de consistencia entre spec/plan/tasks (read-only) |
| `/speckit-implement` | Implementar las tareas del tasks.md en fases |
| `/speckit-checklist` | Generar checklist de calidad de requisitos |
| `/speckit-constitution` | Actualizar la constitución del proyecto |

**Flujo recomendado**: specify → clarify → plan → tasks → analyze → implement

## Estructura del proyecto

```
AporTamos/
├── AporTamos-Frontend/   # React Native + Expo
│   └── app/              # Expo Router (file-based routing)
├── AporTamos-Backend/    # FastAPI + Python
├── specs/                # Especificaciones SpecKit
│   └── 001-household-tasks/
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       ├── data-model.md
│       ├── research.md
│       ├── quickstart.md
│       └── contracts/
└── .specify/             # Configuración SpecKit
    ├── memory/constitution.md
    ├── feature.json
    └── templates/
```
