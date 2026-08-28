# CuotaFácil SaaS V2

Panel maestro multi-cliente para colegios, jardines, academias, condominios, clubes y negocios con cobros recurrentes.

## Incluye

- Dashboard Superadmin responsive.
- Listado de organizaciones conectado a Supabase.
- Alta de organizaciones con tipo, plan y colores.
- Estados Activo / Prueba / Suspendido.
- Métricas consolidadas de plataforma.
- Diseño listo para celular y escritorio.
- Configuración preparada para Vercel.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Desplegar en Vercel

1. Sube la carpeta a un repositorio GitHub o importa el proyecto directamente.
2. Agrega estas variables de entorno en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Ejecuta Deploy.

## Nota de seguridad

El frontend usa únicamente la clave publicable de Supabase. Las operaciones reales deben estar protegidas mediante RLS y autenticación de administrador en Supabase. La interfaz incluye modo de demostración cuando una operación es bloqueada por permisos.
