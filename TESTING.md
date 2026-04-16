# Guía de Pruebas - Workshop be-two

Este documento contiene comandos curl para probar todos los endpoints implementados.

## Prerequisitos

1. Asegúrate de que Docker Desktop esté ejecutándose
2. Inicia MongoDB:
   ```bash
   docker-compose up -d
   ```
3. Crea el archivo `.env` (copia de `.env.template`):
   ```bash
   cp .env.template .env
   ```
4. Instala dependencias:
   ```bash
   npm install
   ```
5. Inicia la aplicación:
   ```bash
   npm run start:dev
   ```

---

## Pruebas del módulo Cars (Referencia)

### Crear un auto
```bash
curl -X POST http://localhost:3000/api/cars \
  -H "Content-Type: application/json" \
  -d '{"nombre": "mcqueen", "modelo": "Lightning", "anio": 2006, "frase": "Ka-chow!"}'
```

### Obtener todos los autos
```bash
curl http://localhost:3000/api/cars
```

### Obtener un auto por ID (reemplaza ID_DEL_AUTO)
```bash
curl http://localhost:3000/api/cars/ID_DEL_AUTO
```

### Actualizar un auto
```bash
curl -X PATCH http://localhost:3000/api/cars/ID_DEL_AUTO \
  -H "Content-Type: application/json" \
  -d '{"frase": "Speed. I am speed."}'
```

### Eliminar un auto
```bash
curl -X DELETE http://localhost:3000/api/cars/ID_DEL_AUTO
```

---

## Pruebas del módulo Bikes (Actividad 2)

### Crear una bicicleta
```bash
curl -X POST http://localhost:3000/api/bikes \
  -H "Content-Type: application/json" \
  -d '{"marca": "Trek", "tipo": "mountain", "velocidades": 21, "descripcion": "Best for trails"}'
```

### Crear otra bicicleta
```bash
curl -X POST http://localhost:3000/api/bikes \
  -H "Content-Type: application/json" \
  -d '{"marca": "Giant", "tipo": "road", "velocidades": 18, "descripcion": "Speed demon"}'
```

### Obtener todas las bicicletas
```bash
curl http://localhost:3000/api/bikes
```

### Obtener una bicicleta por ID (reemplaza ID_DE_LA_BIKE)
```bash
curl http://localhost:3000/api/bikes/ID_DE_LA_BIKE
```

### Actualizar una bicicleta
```bash
curl -X PATCH http://localhost:3000/api/bikes/ID_DE_LA_BIKE \
  -H "Content-Type: application/json" \
  -d '{"velocidades": 24, "descripcion": "Upgraded gears"}'
```

### Eliminar una bicicleta
```bash
curl -X DELETE http://localhost:3000/api/bikes/ID_DE_LA_BIKE
```

### Pruebas de validación - Tipo inválido (debe retornar 400)
```bash
curl -X POST http://localhost:3000/api/bikes \
  -H "Content-Type: application/json" \
  -d '{"marca": "Honda", "tipo": "motorcycle", "velocidades": 1, "descripcion": "Not a bike"}'
```

### Pruebas de validación - Marca duplicada (debe retornar 400)
```bash
curl -X POST http://localhost:3000/api/bikes \
  -H "Content-Type: application/json" \
  -d '{"marca": "Trek", "tipo": "city", "velocidades": 7, "descripcion": "Duplicate brand"}'
```

### Pruebas de validación - ID inválido (debe retornar 400)
```bash
curl -X DELETE http://localhost:3000/api/bikes/invalid-id
```

---

## Pruebas del módulo Pilots (Actividad 3)

### Crear un piloto
```bash
curl -X POST http://localhost:3000/api/pilots \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Lightning McQueen", "escuderia": "Rust-eze", "numero": 95, "activo": true, "campeonatos": 3}'
```

### Crear otro piloto
```bash
curl -X POST http://localhost:3000/api/pilots \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Doc Hudson", "escuderia": "Fabulous Hudson Hornet", "numero": 51, "activo": false, "campeonatos": 3}'
```

### Crear un tercer piloto
```bash
curl -X POST http://localhost:3000/api/pilots \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Cruz Ramirez", "escuderia": "Dinoco", "numero": 2, "activo": true, "campeonatos": 1}'
```

### Obtener todos los pilotos
```bash
curl http://localhost:3000/api/pilots
```

### Obtener un piloto por ID (reemplaza ID_DEL_PILOTO)
```bash
curl http://localhost:3000/api/pilots/ID_DEL_PILOTO
```

### Actualizar un piloto
```bash
curl -X PATCH http://localhost:3000/api/pilots/ID_DEL_PILOTO \
  -H "Content-Type: application/json" \
  -d '{"campeonatos": 4, "activo": true}'
```

### Eliminar un piloto
```bash
curl -X DELETE http://localhost:3000/api/pilots/ID_DEL_PILOTO
```

### Pruebas de validación - Número duplicado (debe retornar 400)
```bash
curl -X POST http://localhost:3000/api/pilots \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Chick Hicks", "escuderia": "Hostile Takeover Bank", "numero": 95, "activo": true, "campeonatos": 0}'
```

### Pruebas de validación - Número negativo (debe retornar 400)
```bash
curl -X POST http://localhost:3000/api/pilots \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Test Pilot", "escuderia": "Test Team", "numero": -1, "activo": true, "campeonatos": 0}'
```

### Pruebas de validación - Campeonatos negativos (debe retornar 400)
```bash
curl -X POST http://localhost:3000/api/pilots \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Test Pilot", "escuderia": "Test Team", "numero": 99, "activo": true, "campeonatos": -5}'
```

### Pruebas de validación - Campo faltante (debe retornar 400)
```bash
curl -X POST http://localhost:3000/api/pilots \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Test Pilot", "escuderia": "Test Team", "numero": 99}'
```

### Pruebas de validación - ID inválido (debe retornar 400)
```bash
curl http://localhost:3000/api/pilots/not-a-valid-id
```

---

## Pruebas de ValidationPipe Global

### Campo extra no permitido (debe retornar 400)
```bash
curl -X POST http://localhost:3000/api/cars \
  -H "Content-Type: application/json" \
  -d '{"nombre": "doc", "modelo": "Hudson", "anio": 1951, "frase": "You can go.", "color": "blue"}'
```

### Tipo de dato incorrecto (debe retornar 400)
```bash
curl -X POST http://localhost:3000/api/bikes \
  -H "Content-Type: application/json" \
  -d '{"marca": "Specialized", "tipo": "mountain", "velocidades": "twenty-one", "descripcion": "Test"}'
```

---

## Verificación de la Base de Datos

### Opción 1: MongoDB Compass
1. Descarga MongoDB Compass: https://www.mongodb.com/try/download/compass
2. Conecta con: `mongodb://localhost:27017`
3. Navega a la base de datos `nest-cars`
4. Verás las colecciones: `cars`, `bikes`, `pilots`

### Opción 2: MongoDB for VS Code Extension
1. Instala la extensión "MongoDB for VS Code"
2. Conecta con: `mongodb://localhost:27017`
3. Explora las colecciones

### Opción 3: Docker CLI
```bash
# Conectar al contenedor de MongoDB
docker exec -it nest-cars-db mongosh

# Dentro de mongosh:
use nest-cars
db.cars.find()
db.bikes.find()
db.pilots.find()
exit
```

---

## Detener el entorno

```bash
# Detener la aplicación: Ctrl+C en la terminal donde corre npm run start:dev

# Detener MongoDB
docker-compose down

# Detener y eliminar datos (cuidado: borra la base de datos)
docker-compose down -v
```

---

## Resumen de Endpoints Implementados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/cars` | Obtener todos los autos |
| GET | `/api/cars/:id` | Obtener un auto por ID |
| POST | `/api/cars` | Crear un auto |
| PATCH | `/api/cars/:id` | Actualizar un auto |
| DELETE | `/api/cars/:id` | Eliminar un auto |
| GET | `/api/bikes` | Obtener todas las bicicletas |
| GET | `/api/bikes/:id` | Obtener una bicicleta por ID |
| POST | `/api/bikes` | Crear una bicicleta |
| PATCH | `/api/bikes/:id` | Actualizar una bicicleta |
| DELETE | `/api/bikes/:id` | Eliminar una bicicleta |
| GET | `/api/pilots` | Obtener todos los pilotos |
| GET | `/api/pilots/:id` | Obtener un piloto por ID |
| POST | `/api/pilots` | Crear un piloto |
| PATCH | `/api/pilots/:id` | Actualizar un piloto |
| DELETE | `/api/pilots/:id` | Eliminar un piloto |

---

## Códigos de Estado HTTP Esperados

| Código | Significado | Cuándo ocurre |
|--------|-------------|---------------|
| 200 | OK | GET, PATCH exitosos |
| 201 | Created | POST exitoso |
| 400 | Bad Request | Validación fallida, ID inválido, duplicado |
| 404 | Not Found | Recurso no encontrado |
| 500 | Internal Server Error | Error inesperado del servidor |
