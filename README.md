# Malla Curricular PUCP - Backend Lambda Demo

Esta aplicación es un demo educativo para una clase de DevSecOps. Proporciona una API serverless en AWS Lambda (Node.js 20) que expone la malla curricular de Ingeniería Informática PUCP como un grafo de cursos y prerrequisitos.

## Arquitectura

- `src/lambda.js`: lógica de la Lambda que construye el grafo y atiende `GET` con `queryStringParameters.search`.
- `data/courses.json`: datos empaquetados junto al código.
- Lambda Function URL expone la API directamente sin API Gateway.
- Respuesta JSON:
  - `nodes`: lista de cursos
  - `edges`: lista de aristas `{from,to,type}`
- CORS abierto: `Access-Control-Allow-Origin: *`

## Endpoints

- `GET /?search=<texto>`
  - con `search`: devuelve subgrafo con cursos coincidentes, sus prerrequisitos directos y dependientes directos.
  - sin `search`: devuelve el grafo completo.

## Estructura del grafo

- `nodes`: cursos seleccionados con `id`, `name`, `credits`, `cycle`, `type`.
- `edges`: cada prerrequisito representa `{from: cursoOrigen, to: cursoDestino, type}`.

## Cómo correr local

```bash
cd /Users/jdelcastillo/code/pucp/clase_magistral_backend
pnpm install
pnpm test
```

## Cómo crear la Lambda la primera vez

El entorno AWS Academy Learner Lab no permite crear IAM roles. La función Lambda `malla-api` debe existir previamente y usar un rol `LabRole` proporcionado por el entorno.

```bash
zip -r function.zip src/lambda.js data/courses.json package.json package-lock.json
aws lambda create-function \
  --function-name malla-api \
  --runtime nodejs20.x \
  --role arn:aws:iam::123456789012:role/LabRole \
  --handler src/lambda.handler \
  --zip-file fileb://function.zip \
  --description "API de malla curricular PUCP" \
  --timeout 10 \
  --memory-size 128
```

Reemplaza `arn:aws:iam::123456789012:role/LabRole` con el ARN real de `LabRole` del entorno.

## GitHub Actions y secretos

Secrets requeridos en GitHub:

- `SONAR_TOKEN`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`

Jobs del pipeline:

1. `quality`: corre tests, cobertura y SonarCloud.
2. `security`: corre Semgrep con `p/default` y `p/python`.
3. `deploy`: en `main`, empaqueta y actualiza código de Lambda.

## Refrescar credenciales del Learner Lab

Las credenciales temporales del Learner Lab vencen cada 4 horas. Actualiza los secretos de GitHub antes de un despliegue con los valores actuales de:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`

## Notas

- No se usan dependencias de producción fuera de la librería estándar de Node.js.
- `sonar-project.properties` incluye placeholders `TODO_projectKey` y `TODO_organization`.
