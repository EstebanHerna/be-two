# NestJS with MongoDB - Workshop be-two

## 📋 Resumen del Proyecto

Este proyecto es una API REST construida con NestJS y MongoDB que gestiona tres recursos:
- **Cars** (Autos) - Módulo de referencia
- **Bikes** (Bicicletas) - Actividad 2 completada
- **Pilots** (Pilotos) - Actividad 3 completada

### Tecnologías Utilizadas
- NestJS 10.x
- MongoDB con Mongoose
- TypeScript
- Docker (para MongoDB local)
- class-validator y class-transformer (validación de DTOs)

### Estructura del Proyecto
```
src/
├── cars/           # Módulo de referencia (completo)
├── bikes/          # Actividad 2 (completada)
├── pilots/         # Actividad 3 (completada)
├── common/         # Pipes compartidos (ParseMongoIdPipe)
├── app.module.ts   # Módulo principal
└── main.ts         # Bootstrap de la aplicación
```

### Endpoints Disponibles
- `GET/POST/PATCH/DELETE /api/cars/:id?`
- `GET/POST/PATCH/DELETE /api/bikes/:id?`
- `GET/POST/PATCH/DELETE /api/pilots/:id?`

Ver [TESTING.md](./TESTING.md) para comandos curl de prueba.

---

## Respuestas a las Preguntas de Validación

---

### Pregunta 1: Constraint `unique` y normalización de datos

**¿MongoDB considera "McQueen" y "mcqueen" como duplicados?**

No, MongoDB por defecto considera que "McQueen" y "mcqueen" son valores diferentes porque la comparación es case-sensitive. Sin embargo, en este proyecto **sí se consideran duplicados** debido a una normalización que se hace en el código.

**Línea que afecta este comportamiento:**

En `cars.service.ts`, dentro del método `create`:

```typescript
createCarDto.nombre = createCarDto.nombre.toLowerCase();
```

**¿Qué hace exactamente esta línea?**

Convierte el valor del campo `nombre` a minúsculas antes de guardarlo en la base de datos. Esto significa que sin importar cómo el cliente envíe el nombre ("McQueen", "MCQUEEN", "mcqueen"), siempre se almacenará como "mcqueen".

**Consecuencia en el constraint `unique`:**

Al normalizar todos los nombres a minúsculas, el constraint `unique: true` de MongoDB efectivamente se vuelve case-insensitive. Si intentas crear un segundo auto con cualquier variación de mayúsculas/minúsculas del mismo nombre, MongoDB detectará que ya existe "mcqueen" y lanzará el error 11000 (duplicate key error).

La misma normalización también ocurre en el método `update`:

```typescript
if (updateCarDto.nombre) {
  updateCarDto.nombre = updateCarDto.nombre.toLowerCase();
}
```

---

### Pregunta 2: Validación de ID en dos lugares diferentes

**¿Por qué existen ambas validaciones?**

Existen en diferentes capas de la arquitectura por razones de diseño y reutilización:

1. **`isValidObjectId` en `findOne` (servicio):** Valida el ID porque `findOne` es llamado por otros métodos del servicio (como `update`). Es una validación interna que protege la lógica de negocio.

2. **`ParseMongoIdPipe` en `remove` (controlador):** Valida el ID a nivel de controlador, interceptando la petición antes de que llegue al servicio. Es una validación de entrada HTTP.

**¿Qué pasaría si `findOne` no tuviera el check y recibiera "abc"?**

```typescript
const car = await this.carsModel.findById("abc");
```

Mongoose intentaría convertir "abc" a ObjectId y fallaría internamente. Dependiendo de la versión de Mongoose, podría:
- Lanzar un `CastError` (error de conversión)
- Retornar `null` (tratándolo como ID no encontrado)

En este caso, el código lanzaría un `NotFoundException` con el mensaje "Car with id abc not found", lo cual es técnicamente incorrecto porque el problema no es que no exista, sino que el formato del ID es inválido.

**Respuesta HTTP:** 404 Not Found (incorrecto, debería ser 400 Bad Request)

**¿Qué pasaría si `remove` no usara `ParseMongoIdPipe` y recibiera "abc"?**

El método `remove` llamaría directamente a:

```typescript
const { deletedCount } = await this.carsModel.deleteOne({ _id: "abc" });
```

MongoDB intentaría buscar un documento con `_id: "abc"` (como string), no encontraría ninguno, y `deletedCount` sería 0. El código lanzaría:

```typescript
throw new BadRequestException(`Car with id abc not found`);
```

**Respuesta HTTP:** 400 Bad Request

**¿Por qué son diferentes?**

- Sin validación en `findOne`: 404 (mensaje engañoso: "no encontrado" cuando en realidad el formato es inválido)
- Sin `ParseMongoIdPipe` en `remove`: 400 (mensaje engañoso: "no encontrado" cuando en realidad el formato es inválido, pero al menos el código de estado es correcto)

La mejor práctica es validar en ambos lugares:
- En el **Pipe** para rechazar requests HTTP inválidos tempranamente con el mensaje correcto
- En el **servicio** para proteger la lógica interna cuando el método es llamado desde otros servicios

---

### Pregunta 3: `try/catch` en `create` pero no en `findAll`

**¿Por qué `create` necesita `try/catch` pero `findAll` no?**

`create` puede lanzar errores de **violación de constraints** de MongoDB, específicamente:

- **Error 11000:** Duplicate key error (cuando intentas insertar un documento que viola el constraint `unique`)

Este error ocurre durante operaciones de **escritura** (INSERT, UPDATE) cuando hay constraints definidos en el schema.

**¿Qué tipo de error puede lanzar `create` que `findAll` nunca lanzaría?**

Error de duplicación (código 11000). `findAll` es una operación de **lectura** que simplemente retorna documentos. No puede violar constraints porque no modifica datos.

Otros errores que `create` podría lanzar pero `findAll` no:
- Validación de schema (tipos incorrectos)
- Violación de constraints (unique, required)
- Errores de índices

**Si removes el `try/catch` de `create` y MongoDB lanza error 11000, ¿qué HTTP status recibiría el cliente?**

**Respuesta:** 500 Internal Server Error

**Razonamiento:**

1. MongoDB lanza el error 11000
2. Sin el `try/catch`, el error no es capturado por el servicio
3. El error se propaga hasta el Exception Filter global de NestJS
4. NestJS no reconoce el error 11000 como un error de cliente (400), lo trata como un error inesperado del servidor
5. El cliente recibe un 500 con un mensaje genérico

Con el `try/catch` y el método `handleException`:

```typescript
if (error.code === 11000) {
  throw new BadRequestException(`Car exists in db ${JSON.stringify(error.keyValue)}`);
}
```

El error se transforma en un `BadRequestException` (400) con un mensaje descriptivo, que es la respuesta correcta para un error de validación de negocio.

---

### Pregunta 4: Merge con spread vs. query adicional

**¿Cuántas queries hace el método `update` en total?**

**Respuesta:** 2 queries

1. `await this.findOne(id)` → hace internamente `await this.carsModel.findById(id)` (1 query)
2. `await car.updateOne(updateCarDto)` → actualiza el documento (1 query)

**¿Puede haber diferencia entre lo que retorna la API y lo que está en MongoDB?**

**Sí, puede haber diferencia.**

El código hace:

```typescript
return { ...car.toJSON(), ...updateCarDto };
```

Esto retorna el estado **antes** de la actualización (`car.toJSON()`) mezclado con los campos enviados en el DTO (`updateCarDto`). No refleja el estado real después de la actualización en MongoDB.

**Escenario concreto donde esto causa problemas:**

Imagina que el schema tiene un **middleware de Mongoose** que modifica valores antes de guardar:

```typescript
CarSchema.pre('save', function(next) {
  // Middleware que capitaliza el modelo automáticamente
  this.modelo = this.modelo.toUpperCase();
  next();
});
```

O si hay **valores por defecto** o **transformaciones** en el schema:

```typescript
@Prop({ default: () => new Date() })
updatedAt: Date;
```

**Ejemplo:**

1. Cliente envía: `PATCH /cars/123` con `{ "modelo": "lightning" }`
2. El método retorna: `{ nombre: "mcqueen", modelo: "lightning", ... }` (lo que el cliente envió)
3. Pero en MongoDB está: `{ nombre: "mcqueen", modelo: "LIGHTNING", updatedAt: "2026-04-16T12:00:00Z" }`

**Solución correcta:**

Hacer una tercera query para obtener el documento actualizado:

```typescript
await car.updateOne(updateCarDto);
return this.findOne(id); // O: return this.carsModel.findById(id);
```

O usar `findByIdAndUpdate` con `{ new: true }`:

```typescript
return this.carsModel.findByIdAndUpdate(id, updateCarDto, { new: true });
```

---

### Pregunta 5: `forRootAsync` vs. `forRoot`

**¿Cuál es el problema con usar `forRoot` directamente?**

```typescript
MongooseModule.forRoot(process.env.MONGODB_URL || 'mongodb://localhost:27017/nest-cars')
```

**Problema:** `process.env.MONGODB_URL` se evalúa **en el momento en que el archivo del módulo es importado por Node.js**, que ocurre **antes** de que `ConfigModule` cargue el archivo `.env`.

**¿En qué momento exacto se evalúa `process.env.MONGODB_URL`?**

Cuando Node.js ejecuta la línea `import { AppModule } from './app.module'` en `main.ts`, el archivo `app.module.ts` es parseado y ejecutado. En ese momento, el decorador `@Module` y sus parámetros son evaluados **síncronamente**.

**Secuencia de eventos con `forRoot`:**

1. Node.js importa `app.module.ts`
2. Evalúa `process.env.MONGODB_URL` → `undefined` (el `.env` no se ha cargado aún)
3. Usa el fallback: `'mongodb://localhost:27017/nest-cars'`
4. NestJS inicializa `ConfigModule` y carga el `.env`
5. Demasiado tarde: Mongoose ya se conectó a localhost

**¿Por qué `forRootAsync` con `useFactory` soluciona esto?**

`forRootAsync` permite **diferir** la evaluación de la configuración hasta que NestJS haya inicializado todos los módulos en el orden correcto.

```typescript
MongooseModule.forRootAsync({
  useFactory: () => ({
    uri: process.env.MONGODB_URL || 'mongodb://localhost:27017/nest-cars',
  }),
})
```

**Secuencia de eventos con `forRootAsync`:**

1. Node.js importa `app.module.ts`
2. NestJS ve `forRootAsync` y registra que necesita ejecutar una factory **después**
3. NestJS inicializa `ConfigModule` (carga el `.env`)
4. NestJS ejecuta la `useFactory` → ahora `process.env.MONGODB_URL` tiene el valor correcto
5. Mongoose se conecta con la URL correcta

**Versión aún mejor (con inyección de dependencias):**

```typescript
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    uri: configService.getOrThrow<string>('MONGODB_URL'),
  }),
  inject: [ConfigService],
})
```

Esto hace explícita la dependencia de `ConfigModule` y usa `getOrThrow` para fallar rápido si la variable no existe.

---

### Pregunta 6: Imports y registro de schemas

**Escenario 1: Olvidar importar `CarsModule` en `AppModule`**

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({ ... }),
    // CarsModule, ← OLVIDADO
    BikesModule,
  ],
})
export class AppModule {}
```

**¿Qué pasa cuando la app inicia?**

La aplicación **inicia sin errores**. NestJS no sabe que `CarsModule` existe, así que simplemente no lo registra.

**¿Cuándo aparece el error?**

En el **primer request** a cualquier endpoint de `/api/cars`:

```
Error: Cannot GET /api/cars
```

O más específicamente, un 404 Not Found, porque NestJS no tiene ninguna ruta registrada para `/api/cars`.

**Escenario 2: Importar `CarsModule` pero olvidar `MongooseModule.forFeature`**

```typescript
@Module({
  imports: [
    // MongooseModule.forFeature([...]), ← OLVIDADO
  ],
  controllers: [CarsController],
  providers: [CarsService],
})
export class CarsModule {}
```

**¿Qué error ocurre?**

La aplicación **falla al iniciar** con un error de inyección de dependencias:

```
Error: Nest can't resolve dependencies of the CarsService (?). 
Please make sure that the argument "CarModel" at index [0] is available in the CarsModule context.
```

**¿Qué archivo mirarías para diagnosticarlo?**

1. **`cars.service.ts`** - para ver qué dependencia está intentando inyectar:
   ```typescript
   constructor(
     @InjectModel(Car.name)  // ← Esto requiere que el modelo esté registrado
     private readonly carsModel: Model<Car>,
   ) {}
   ```

2. **`cars.module.ts`** - para verificar que el modelo está registrado con `forFeature`

**Explicación:**

`@InjectModel(Car.name)` le dice a NestJS: "inyéctame el modelo de Mongoose registrado con el nombre 'Car'". Si `MongooseModule.forFeature` no está en los imports, ese modelo nunca se registra en el contenedor de inyección de dependencias, y NestJS no puede resolver la dependencia.

---

### Pregunta 7: `remove` sin llamar a `findOne` primero

**¿Cuál es la ventaja de no llamar a `findOne` antes de eliminar?**

**Ventaja principal: Eficiencia - reduce de 2 queries a 1 query**

Comparación:

**Opción A (actual - sin `findOne`):**
```typescript
async remove(id: string) {
  const { deletedCount } = await this.carsModel.deleteOne({ _id: id });
  if (deletedCount === 0) {
    throw new BadRequestException(`Car with id ${id} not found`);
  }
}
```
- 1 query: `deleteOne`

**Opción B (con `findOne`):**
```typescript
async remove(id: string) {
  const car = await this.findOne(id);  // Query 1: findById
  await car.deleteOne();                // Query 2: deleteOne
}
```
- 2 queries: `findById` + `deleteOne`

**Ventajas adicionales:**

1. **Menos latencia:** Una sola ida y vuelta a la base de datos
2. **Menos carga en la DB:** Menos operaciones de lectura
3. **Atomicidad:** No hay ventana de tiempo entre verificar y eliminar donde otro proceso podría eliminar el documento

**¿Bajo qué condición exacta puede `deletedCount` ser 0?**

El endpoint DELETE usa `ParseMongoIdPipe`, por lo que sabemos que `id` tiene un **formato válido** de ObjectId (24 caracteres hexadecimales).

`deletedCount` será 0 cuando:

**El ID tiene formato válido pero no existe ningún documento con ese `_id` en la colección.**

Ejemplos:
- `507f1f77bcf86cd799439011` - formato válido, pero nunca se creó un auto con ese ID
- Un auto que existía pero fue eliminado previamente
- Un ID generado manualmente que nunca se usó

**No puede ser 0 por:**
- Formato inválido (el Pipe ya lo rechazó)
- Error de conexión (lanzaría una excepción, no retornaría `deletedCount: 0`)

---

### Pregunta 8: Pipe vs. validación en el servicio

**¿Qué ventaja arquitectural se pierde al mover la lógica del Pipe al servicio?**

**Ventajas perdidas:**

1. **Separación de responsabilidades:**
   - **Pipe:** Validación de entrada HTTP (capa de presentación)
   - **Servicio:** Lógica de negocio (capa de dominio)
   
   Mover la validación al servicio mezcla responsabilidades.

2. **Reutilización:**
   El Pipe puede usarse en múltiples controladores y endpoints sin duplicar código:
   ```typescript
   @Delete(':id')
   remove(@Param('id', ParseMongoIdPipe) id: string) { ... }
   
   @Get(':id')
   findOne(@Param('id', ParseMongoIdPipe) id: string) { ... }
   ```

3. **Fail-fast:**
   El Pipe valida **antes** de que el controlador ejecute, ahorrando procesamiento innecesario.

4. **Claridad en el contrato de la API:**
   Al ver el controlador, es evidente qué validaciones se aplican a cada parámetro.

**¿En qué punto del request lifecycle ejecuta el Pipe vs. el servicio?**

```
HTTP Request
      ↓
  Middlewares
      ↓
    Guards
      ↓
  Interceptors (Before)
      ↓
  Pipes / Decorators    ← ParseMongoIdPipe ejecuta AQUÍ
      ↓
  Controller            ← Recibe el request
      ↓
  Service               ← Validación en servicio ejecutaría AQUÍ
      ↓
  Interceptors (After)
      ↓
  Exception Filters
      ↓
HTTP Response
```

**Diferencia:** El Pipe ejecuta **antes** del controlador, mientras que la validación en el servicio ejecuta **después** de que el controlador ya fue invocado.

**¿Qué pasa si se usa `@Param('id', ParseMongoIdPipe)` pero se remueve `@Injectable()` del Pipe?**

**Respuesta:** NestJS **puede** instanciar el Pipe, pero **no puede inyectar dependencias** en él.

**Explicación:**

- `@Injectable()` registra la clase en el contenedor de inyección de dependencias de NestJS
- Los Pipes pueden usarse de dos formas:

**Forma 1 - Instancia directa (sin DI):**
```typescript
@Param('id', new ParseMongoIdPipe())
```
Funciona sin `@Injectable()` porque creas la instancia manualmente.

**Forma 2 - Por clase (con DI):**
```typescript
@Param('id', ParseMongoIdPipe)  // ← Pasa la clase, no una instancia
```
**Requiere** `@Injectable()` porque NestJS necesita instanciar la clase y resolver sus dependencias.

En este caso específico, `ParseMongoIdPipe` no tiene dependencias en su constructor, así que:

```typescript
// Sin @Injectable()
@Param('id', ParseMongoIdPipe)  // ← FALLA: NestJS no puede instanciar
@Param('id', new ParseMongoIdPipe())  // ← FUNCIONA: instancia manual
```

Si el Pipe tuviera dependencias:

```typescript
@Injectable()
export class ParseMongoIdPipe implements PipeTransform {
  constructor(private readonly logger: Logger) {}  // ← Dependencia
  ...
}
```

Sin `@Injectable()`, NestJS no podría inyectar `Logger` y fallaría con un error de dependencias no resueltas.

---

### Pregunta 9: Orden de configuración en `main.ts`

**Escenario 1: Reordenar `useGlobalPipes` antes de `setGlobalPrefix` y `enableCors`**

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ ... }));  // ← PRIMERO
  app.setGlobalPrefix('api');
  app.enableCors();

  await app.listen(port);
}
```

**¿Cambia el comportamiento?**

**No, el comportamiento NO cambia.**

**Razón:**

Estas tres configuraciones (`useGlobalPipes`, `setGlobalPrefix`, `enableCors`) son **configuraciones de la aplicación**, no middleware que se ejecuta en orden secuencial.

- `setGlobalPrefix` configura el prefijo de rutas (se aplica al registrar rutas)
- `enableCors` configura headers CORS (se aplica al procesar requests)
- `useGlobalPipes` registra pipes globales (se ejecutan en la fase de Pipes del lifecycle)

El orden de **registro** no afecta el orden de **ejecución** porque cada uno opera en una fase diferente del request lifecycle.

**Escenario 2: Mover `enableCors()` después de `app.listen()`**

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ ... }));

  await app.listen(port);
  app.enableCors();  // ← DESPUÉS de listen
}
```

**¿Afecta algo?**

**Sí, esto es problemático.**

**Explicación:**

`app.listen()` inicia el servidor HTTP y comienza a aceptar requests. Cualquier configuración que se haga **después** de `listen()` puede no aplicarse correctamente a los requests que ya están siendo procesados.

**Momento exacto en que `enableCors` debe registrarse:**

`enableCors()` debe llamarse **antes de `app.listen()`** para que NestJS configure correctamente el middleware de CORS antes de que el servidor comience a aceptar conexiones.

**¿Qué pasa si se llama después?**

- En algunas versiones de NestJS, podría no tener efecto (los requests no tendrán headers CORS)
- En otras, podría aplicarse parcialmente
- Es comportamiento indefinido y no documentado

**Regla general:**

Todas las configuraciones de la aplicación (`setGlobalPrefix`, `enableCors`, `useGlobalPipes`, `useGlobalFilters`, etc.) deben llamarse **antes de `app.listen()`**.

```typescript
// ✅ CORRECTO
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas las configuraciones ANTES de listen
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ ... }));

  // Listen al final
  await app.listen(port);
}
```

---

## Conclusión

Este workshop demuestra conceptos fundamentales de NestJS con MongoDB:

- **Arquitectura en capas:** Controller → Service → Database
- **Validación en múltiples niveles:** Pipes (HTTP) + Service (negocio)
- **Manejo de errores:** try/catch + Exception Filters
- **Inyección de dependencias:** @Injectable, @InjectModel
- **Request lifecycle:** Entender cuándo se ejecuta cada componente
- **Configuración asíncrona:** forRootAsync para dependencias de módulos
- **Optimización:** Reducir queries innecesarias (remove sin findOne)

Cada decisión de diseño tiene trade-offs que deben considerarse según el contexto de la aplicación.
