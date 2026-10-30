/* =====================================================================
   GesPro – Script de login de aplicación (Azure SQL / SQL Server)
   Usuario de base de datos que usa la app Java vía db.properties

   Autor: Curasma Vidal Arthur Sebastian
   Fecha: 30 de octubre de 2026

   NOTA AZURE:
   - En Azure SQL el login se crea a nivel de servidor y el usuario
     dentro de la base. Ejecutar conectado al servidor (master) la
     parte de CREATE LOGIN, y luego dentro de SistemaProductos la
     parte de CREATE USER.
   - Si el login ya existe, omitir CREATE LOGIN o usar el usuario
     administrador de Azure que ya tengas configurado.
   ===================================================================== */

-- ========== Ejecutar en la base master (servidor) ==========
-- CREATE LOGIN gespro WITH PASSWORD = 'GesPro2026!', CHECK_POLICY = OFF;
-- GO

-- ========== Ejecutar dentro de la base SistemaProductos ==========
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'gespro')
    DROP USER gespro;
GO

-- Si usas login de servidor llamado gespro:
-- CREATE USER gespro FOR LOGIN gespro;
-- ALTER ROLE db_owner ADD MEMBER gespro;
-- GO

/* Alternativa simple para clase (mismo administrador de Azure):
   No crear login extra: la aplicación usa el usuario/clave del
   servidor Azure ya configurado en db.properties.

   Ejemplo db.properties:
   db.url=jdbc:sqlserver://SU-SERVIDOR.database.windows.net:1433;databaseName=SistemaProductos;encrypt=true;trustServerCertificate=false;hostNameInCertificate=*.database.windows.net;loginTimeout=30;
   db.user=gespro
   db.password=GesPro2026!
*/

-- Comprobación de permisos / existencia de tablas de autenticación
SELECT name AS Tabla
FROM sys.tables
WHERE name IN ('Usuario', 'Rol')
ORDER BY name;

SELECT IdUsuario, Nombre, Email, Rol, FechaAlta
FROM dbo.Usuario;
GO
