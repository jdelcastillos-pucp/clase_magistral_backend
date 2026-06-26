# Contraste entre Backend y Frontend

> Última alineación: **2026-06-26**. El contrato canónico vive en
> `clase_magistral_frontend/CONTRATO-API.md`; este documento solo resume el contraste.
> Si el backend cambia la forma de la respuesta, actualizar **ambos** en el mismo PR.

## Estado actual del frontend

El repositorio `clase_magistral_frontend` ya publicó `CONTRATO-API.md`, un contrato
detallado de request/response validado contra `src/lambda.js`. La UI (canvas vis-network,
campo de búsqueda, fallback local de `courses.json`) está descrita en el contrato pero
todavía no implementada en código. El contrato es la **fuente de verdad** del formato de datos.

## Backend actual (Node.js Lambda)

### Arquitectura

- `src/lambda.js`: implementación de la AWS Lambda que carga `data/courses.json` y construye un grafo de cursos y prerrequisitos.
- `data/courses.json`: archivo empaquetado con la malla curricular, metadatos y lista de cursos.
- Respuesta de la Lambda: JSON con la forma
  - `nodes`: lista de cursos seleccionados
  - `edges`: lista de relaciones de prerrequisito con `{from, to, type}`
- La API debe exponerse mediante Lambda Function URL, no API Gateway.

### Endpoint

- `GET /?search=<texto>`
  - si `search` existe: devuelve el subgrafo formado por los cursos que coinciden en `id` o `name` (case-insensitive, substring), sus prerrequisitos directos y los dependientes directos.
  - si `search` no está presente o está vacío: devuelve el grafo completo (88 cursos).
- CORS abierto en **toda** respuesta, incluido `500`: `Access-Control-Allow-Origin: *` (constante `CORS_HEADERS`, aplicada también en el `try/catch` del handler).

### Detalles de integración

- El frontend debe llamar a la URL de la Lambda Function URL.
- El frontend debe procesar la respuesta JSON y renderizar:
  - nodos como cursos
  - aristas como prerrequisitos/dependencias
- El backend ya normaliza búsquedas en minúsculas y permite coincidencias parciales en `id` y `name`.

## Comparación de responsabilidades

### Backend debe manejar

- Carga del archivo estático `data/courses.json`.
- Búsqueda y armado del grafo.
- Retorno de datos en formato JSON estructurado.
- Headers de CORS abiertos.
- Testing unitario de la lógica de grafo.
- CI/CD para calidad, seguridad y despliegue.

### Frontend debe manejar

- Interfaz de usuario para buscar cursos.
- Construcción de consultas `search` y llamadas `GET` a la Lambda.
- Renderizado del grafo completo o del subgrafo filtrado.
- Manejo de errores y estado de carga.
- Visualización clara de prerrequisitos y dependientes.

## Consideraciones para contrastar

1. **Desacoplamiento**
   - Backend entrega datos puros como grafo.
   - Frontend se encarga solo de presentación y experiencia.

2. **Formato de datos compartido**
   - Nodos exponen `id`, `name`, `credits`, `cycle`, `type` (el backend **no** incluye `prerequisites` dentro del nodo; el frontend deriva prereqs de `edges`).
   - Aristas exponen `from`, `to`, `type`. `from` = prerrequisito, `to` = curso que lo exige.
   - El backend puede evolucionar la estructura, pero cualquier cambio debe coordinarse con el frontend en el mismo PR del contrato.

3. **CORS y despliegue**
   - Backend ya expone CORS abierto para que un frontend servido desde S3 pueda consumirlo.
   - Si el frontend se despliega en S3/CloudFront, no se requieren cambios adicionales en el backend mientras use la Function URL.

4. **CI/CD y seguridad**
   - El backend contiene `ci.yml` con jobs de quality, security y deploy.
   - El frontend debería tener su propio pipeline si se implementa, pero hoy no hay codebase para ello.

5. **Testing**
   - Backend tiene tests unitarios que prueban búsqueda y armado del grafo.
   - Frontend debería tener pruebas de integración de UI y de consumo de la API si se implementa.

6. **Dependencias**
   - Backend usa solo librerías estándar de Node.js y `c8` para cobertura.
   - Frontend aún no define ninguna dependencia ni framework.

## Diferencias alineadas el 2026-06-26

Resueltas verificando el comportamiento real de `src/lambda.js` (ver detalle en `CONTRATO-API.md`):

| Tema | Acuerdo |
|---|---|
| Búsqueda | case-insensitive + substring por `id` y `name` ✅ |
| Accent-insensitive | ❌ no implementado (deseable, no bloqueante) |
| Sin resultados | `200` + `{nodes:[],edges:[]}`, nunca 404 ✅ |
| Prereqs externos | El backend emite el **edge sin crear nodo**; el frontend crea un stub defensivo ✅ |
| `edge.type` | enum de 4 (`aprobado, simultaneo, nota08, especial`); `buildEdges` cae a `"prerequisite"` solo si faltara `type` (hoy no ocurre) |
| CORS en error | `500` con `CORS_HEADERS` presente ✅ (corregido con `try/catch`) |

## Recomendaciones para el frontend (pendiente de implementar)

- Página con campo de búsqueda + canvas vis-network consumiendo la Function URL.
- Fallback a la copia local de `courses.json` cuando la API falle o las credenciales del Learner Lab venzan.
- Nodos stub para prereqs externos referenciados por `edges` pero ausentes de `nodes`.
- Estilo de arista por `edge.type` con un estilo por defecto para valores desconocidos.

## Observaciones finales

- El backend está listo y alineado con `CONTRATO-API.md`; falta implementar la UI del frontend.
- Mantener sincronizados `CONTRATO-API.md` (fuente de verdad) y este documento ante cualquier cambio de formato.
