/* =====================================================================
   GesPro / SistemaProductos  -  SCRIPT PARA AZURE SQL DATABASE
   Sistema web de gestión de productos y tienda (tecnología)

   Autor: Curasma Vidal Arthur Sebastian
   Fecha: 30 de octubre de 2026

   CÓMO EJECUTARLO (una sola vez):
     1) En SSMS: Conectar -> Motor de base de datos
          Servidor:        SU-SERVIDOR.database.windows.net
          Autenticación:   Autenticación de SQL Server
     2) Explorador de objetos > Bases de datos > SistemaProductos
        (la base creada en el portal de Azure) > clic derecho > Nueva consulta
        (en Azure no existe USE; el script corre dentro de esa base).
     3) Abrir este archivo y pulsar F5.

   Se puede volver a ejecutar: borra las tablas/vistas y las crea de nuevo
   con los datos de ejemplo de GesPro.
   ===================================================================== */

/* ---- Limpieza (para poder ejecutarlo más de una vez) ---- */
DROP VIEW IF EXISTS dbo.vw_CarritoDetalle;
DROP VIEW IF EXISTS dbo.vw_ProductoDetalle;
DROP VIEW IF EXISTS dbo.vw_PedidoResumen;
DROP TABLE IF EXISTS dbo.DetalleCarrito;
DROP TABLE IF EXISTS dbo.Carrito;
DROP TABLE IF EXISTS dbo.DetallePedido;
DROP TABLE IF EXISTS dbo.Pedido;
DROP TABLE IF EXISTS dbo.Producto;
DROP TABLE IF EXISTS dbo.Usuario;
DROP TABLE IF EXISTS dbo.Categoria;
DROP TABLE IF EXISTS dbo.EstadoPedido;
DROP TABLE IF EXISTS dbo.EstadoProducto;
DROP TABLE IF EXISTS dbo.Rol;
GO

/* =====================================================================
   1. TABLAS DE CATÁLOGO
   ===================================================================== */

CREATE TABLE dbo.Rol (
    Nombre      VARCHAR(10)   NOT NULL,
    Descripcion NVARCHAR(100) NOT NULL,
    CONSTRAINT PK_Rol PRIMARY KEY (Nombre)
);
GO

CREATE TABLE dbo.EstadoProducto (
    Nombre      VARCHAR(15)   NOT NULL,
    Descripcion NVARCHAR(100) NOT NULL,
    CONSTRAINT PK_EstadoProducto PRIMARY KEY (Nombre)
);
GO

CREATE TABLE dbo.EstadoPedido (
    Nombre      VARCHAR(12)   NOT NULL,
    Descripcion NVARCHAR(100) NOT NULL,
    CONSTRAINT PK_EstadoPedido PRIMARY KEY (Nombre)
);
GO

CREATE TABLE dbo.Categoria (
    IdCategoria INT IDENTITY(1,1) NOT NULL,
    Nombre      NVARCHAR(50)      NOT NULL,
    CONSTRAINT PK_Categoria        PRIMARY KEY (IdCategoria),
    CONSTRAINT UQ_Categoria_Nombre UNIQUE (Nombre)
);
GO

/* =====================================================================
   2. USUARIO
   La clave nunca se guarda en texto plano: Sal + Hash (PBKDF2-SHA256,
   120000 iteraciones, 256 bits, Base64), igual que ClaveUtil.java.
   ===================================================================== */
CREATE TABLE dbo.Usuario (
    IdUsuario  INT IDENTITY(1,1)  NOT NULL,
    Nombre     NVARCHAR(100)      NOT NULL,
    Email      NVARCHAR(150)      NOT NULL,
    Telefono   VARCHAR(20)        NOT NULL CONSTRAINT DF_Usuario_Telefono  DEFAULT '',
    Rol        VARCHAR(10)        NOT NULL,
    Sal        VARCHAR(64)        NOT NULL,
    Hash       VARCHAR(128)       NOT NULL,
    FechaAlta  DATETIME2(0)       NOT NULL CONSTRAINT DF_Usuario_FechaAlta DEFAULT SYSDATETIME(),
    CONSTRAINT PK_Usuario       PRIMARY KEY (IdUsuario),
    CONSTRAINT UQ_Usuario_Email UNIQUE (Email),
    CONSTRAINT FK_Usuario_Rol   FOREIGN KEY (Rol) REFERENCES dbo.Rol (Nombre)
);
GO

/* =====================================================================
   3. PRODUCTO
   Codigo es la clave primaria (PRD-001...). Imagen opcional (bytes + MIME).
   ===================================================================== */
CREATE TABLE dbo.Producto (
    Codigo      VARCHAR(10)    NOT NULL,
    Nombre      NVARCHAR(100)  NOT NULL,
    IdCategoria INT            NOT NULL,
    Precio      DECIMAL(10,2)  NOT NULL,
    Stock       INT            NOT NULL CONSTRAINT DF_Producto_Stock  DEFAULT 0,
    Estado      VARCHAR(15)    NOT NULL CONSTRAINT DF_Producto_Estado DEFAULT 'Disponible',
    Imagen      VARBINARY(MAX) NULL,
    ImagenTipo  VARCHAR(50)    NULL,
    CONSTRAINT PK_Producto           PRIMARY KEY (Codigo),
    CONSTRAINT FK_Producto_Categoria FOREIGN KEY (IdCategoria) REFERENCES dbo.Categoria (IdCategoria),
    CONSTRAINT FK_Producto_Estado    FOREIGN KEY (Estado)      REFERENCES dbo.EstadoProducto (Nombre),
    CONSTRAINT CK_Producto_Precio    CHECK (Precio >= 0),
    CONSTRAINT CK_Producto_Stock     CHECK (Stock >= 0)
);
GO

CREATE INDEX IX_Producto_Categoria ON dbo.Producto (IdCategoria);
CREATE INDEX IX_Producto_Nombre    ON dbo.Producto (Nombre);
GO

/* =====================================================================
   4. PEDIDO
   NumeroPedido es el "PED-0001" visible (columna calculada).
   ===================================================================== */
CREATE TABLE dbo.Pedido (
    IdPedido      INT IDENTITY(1,1) NOT NULL,
    NumeroPedido  AS ('PED-' + RIGHT('0000' + CAST(IdPedido AS VARCHAR(10)), 4)) PERSISTED,
    IdUsuario     INT               NOT NULL,
    Telefono      VARCHAR(20)       NOT NULL,
    Direccion     NVARCHAR(250)     NOT NULL,
    Observaciones NVARCHAR(500)     NULL,
    Fecha         DATETIME2(0)      NOT NULL CONSTRAINT DF_Pedido_Fecha  DEFAULT SYSDATETIME(),
    Estado        VARCHAR(12)       NOT NULL CONSTRAINT DF_Pedido_Estado DEFAULT 'Pendiente',
    CONSTRAINT PK_Pedido         PRIMARY KEY (IdPedido),
    CONSTRAINT FK_Pedido_Usuario FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuario (IdUsuario),
    CONSTRAINT FK_Pedido_Estado  FOREIGN KEY (Estado)    REFERENCES dbo.EstadoPedido (Nombre)
);
GO

CREATE UNIQUE INDEX UX_Pedido_Numero ON dbo.Pedido (NumeroPedido);
CREATE INDEX IX_Pedido_Usuario ON dbo.Pedido (IdUsuario, Fecha DESC);
CREATE INDEX IX_Pedido_Estado  ON dbo.Pedido (Estado);
GO

/* =====================================================================
   5. DETALLE DE PEDIDO
   Copia nombre y precio al comprar (historial inmutable).
   ===================================================================== */
CREATE TABLE dbo.DetallePedido (
    IdPedido       INT            NOT NULL,
    CodigoProducto VARCHAR(10)    NOT NULL,
    Nombre         NVARCHAR(100)  NOT NULL,
    Precio         DECIMAL(10,2)  NOT NULL,
    Cantidad       INT            NOT NULL,
    Subtotal       AS (CAST(ROUND(Precio * Cantidad, 2) AS DECIMAL(12,2))) PERSISTED,
    CONSTRAINT PK_DetallePedido    PRIMARY KEY (IdPedido, CodigoProducto),
    CONSTRAINT FK_Detalle_Pedido   FOREIGN KEY (IdPedido)       REFERENCES dbo.Pedido (IdPedido) ON DELETE CASCADE,
    CONSTRAINT FK_Detalle_Producto FOREIGN KEY (CodigoProducto) REFERENCES dbo.Producto (Codigo),
    CONSTRAINT CK_Detalle_Precio   CHECK (Precio >= 0),
    CONSTRAINT CK_Detalle_Cantidad CHECK (Cantidad BETWEEN 1 AND 99)
);
GO

CREATE INDEX IX_Detalle_Producto ON dbo.DetallePedido (CodigoProducto);
GO

/* =====================================================================
   6. CARRITO Y DETALLE DE CARRITO
   Un usuario tiene como máximo un carrito (UNIQUE sobre IdUsuario).
   ===================================================================== */
CREATE TABLE dbo.Carrito (
    IdCarrito          INT IDENTITY(1,1) NOT NULL,
    IdUsuario          INT               NOT NULL,
    FechaCreacion      DATETIME2(0)      NOT NULL CONSTRAINT DF_Carrito_Creacion DEFAULT SYSDATETIME(),
    FechaActualizacion DATETIME2(0)      NOT NULL CONSTRAINT DF_Carrito_Actual   DEFAULT SYSDATETIME(),
    CONSTRAINT PK_Carrito         PRIMARY KEY (IdCarrito),
    CONSTRAINT UQ_Carrito_Usuario UNIQUE (IdUsuario),
    CONSTRAINT FK_Carrito_Usuario FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuario (IdUsuario) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.DetalleCarrito (
    IdCarrito      INT          NOT NULL,
    CodigoProducto VARCHAR(10)  NOT NULL,
    Cantidad       INT          NOT NULL,
    FechaAgregado  DATETIME2(0) NOT NULL CONSTRAINT DF_DetCarrito_Fecha DEFAULT SYSDATETIME(),
    CONSTRAINT PK_DetalleCarrito       PRIMARY KEY (IdCarrito, CodigoProducto),
    CONSTRAINT FK_DetCarrito_Carrito   FOREIGN KEY (IdCarrito)      REFERENCES dbo.Carrito (IdCarrito) ON DELETE CASCADE,
    CONSTRAINT FK_DetCarrito_Producto  FOREIGN KEY (CodigoProducto) REFERENCES dbo.Producto (Codigo)   ON DELETE CASCADE,
    CONSTRAINT CK_DetCarrito_Cantidad  CHECK (Cantidad BETWEEN 1 AND 99)
);
GO

CREATE INDEX IX_DetCarrito_Producto ON dbo.DetalleCarrito (CodigoProducto);
GO

/* =====================================================================
   7. DATOS INICIALES (GesPro)
   ===================================================================== */

INSERT INTO dbo.Rol (Nombre, Descripcion) VALUES
('ADMIN',   N'Administrador: gestiona productos, pedidos y reportes'),
('CLIENTE', N'Cliente: compra en la tienda y ve sus pedidos');
GO

INSERT INTO dbo.EstadoProducto (Nombre, Descripcion) VALUES
('Disponible',    N'Se puede comprar'),
('Agotado',       N'Sin stock por el momento'),
('Descontinuado', N'Retirado del catálogo');
GO

INSERT INTO dbo.EstadoPedido (Nombre, Descripcion) VALUES
('Pendiente',  N'Recibido, aún sin atender'),
('Confirmado', N'Aceptado por la tienda'),
('Entregado',  N'Entregado al cliente'),
('Cancelado',  N'Cancelado; el stock se devuelve');
GO

-- Cuentas de prueba (mismos hashes PBKDF2 que el proyecto Java de referencia):
--   admin:   arthur.curasma@gespro.pe / Admin123
--   cliente: cliente@gespro.pe / Cliente123
INSERT INTO dbo.Usuario (Nombre, Email, Telefono, Rol, Sal, Hash) VALUES
(N'Curasma Vidal Arthur Sebastian', 'arthur.curasma@gespro.pe', '',          'ADMIN',
    'lTYyU0w8mb9wOdNtZrfFRA==', 'jmyr6wl3yIgxqwAQ6FxBb0blDeLp3UMxDe1EWQJ9o1U='),
(N'Cliente de Prueba',              'cliente@gespro.pe',        '999888777', 'CLIENTE',
    'qdUZkv08MZmRnlFEMdxF8Q==', 'yJ99j6ZL+XQBzlpMooY70JQckY6q3MOoyE2zj/ZANHQ=');
GO

INSERT INTO dbo.Categoria (Nombre) VALUES
(N'Monitores'), (N'Periféricos'), (N'Computadoras'),
(N'Almacenamiento'), (N'Accesorios'), (N'Audio');
GO

INSERT INTO dbo.Producto (Codigo, Nombre, IdCategoria, Precio, Stock, Estado)
SELECT v.Codigo, v.Nombre, c.IdCategoria, v.Precio, v.Stock, v.Estado
FROM (VALUES
    ('PRD-001', N'Monitor LG UltraGear 24"',     N'Monitores',       899.90, 12, 'Disponible'),
    ('PRD-002', N'Teclado Logitech K380',        N'Periféricos',     189.50, 28, 'Disponible'),
    ('PRD-003', N'Mouse inalámbrico M185',       N'Periféricos',      79.90,  0, 'Agotado'),
    ('PRD-004', N'Laptop Lenovo IdeaPad 3',      N'Computadoras',   2699.00,  7, 'Disponible'),
    ('PRD-005', N'Disco SSD Kingston 1TB',       N'Almacenamiento',  329.00, 19, 'Disponible'),
    ('PRD-006', N'Webcam Logitech C920',         N'Accesorios',      399.00,  0, 'Agotado'),
    ('PRD-007', N'Auriculares Sony WH-CH520',    N'Audio',           249.90, 15, 'Disponible'),
    ('PRD-008', N'Memoria RAM Kingston 16GB',    N'Almacenamiento',  189.00, 22, 'Disponible')
) AS v (Codigo, Nombre, Categoria, Precio, Stock, Estado)
JOIN dbo.Categoria c ON c.Nombre = v.Categoria;
GO

/* =====================================================================
   8. VISTAS
   ===================================================================== */

CREATE VIEW dbo.vw_PedidoResumen AS
SELECT  p.IdPedido,
        p.NumeroPedido,
        p.IdUsuario,
        u.Nombre  AS ClienteNombre,
        u.Email   AS ClienteEmail,
        p.Telefono,
        p.Direccion,
        p.Observaciones,
        p.Fecha,
        p.Estado,
        ISNULL(SUM(d.Subtotal), 0) AS Total,
        ISNULL(SUM(d.Cantidad), 0) AS Unidades
FROM    dbo.Pedido p
JOIN    dbo.Usuario u ON u.IdUsuario = p.IdUsuario
LEFT JOIN dbo.DetallePedido d ON d.IdPedido = p.IdPedido
GROUP BY p.IdPedido, p.NumeroPedido, p.IdUsuario, u.Nombre, u.Email,
         p.Telefono, p.Direccion, p.Observaciones, p.Fecha, p.Estado;
GO

CREATE VIEW dbo.vw_ProductoDetalle AS
SELECT  pr.Codigo,
        pr.Nombre,
        c.Nombre AS Categoria,
        pr.Precio,
        pr.Stock,
        pr.Estado,
        CAST(pr.Precio * pr.Stock AS DECIMAL(12,2)) AS ValorInventario,
        CASE WHEN pr.Imagen IS NULL THEN 0 ELSE 1 END AS TieneImagen
FROM    dbo.Producto pr
JOIN    dbo.Categoria c ON c.IdCategoria = pr.IdCategoria;
GO

CREATE VIEW dbo.vw_CarritoDetalle AS
SELECT  ca.IdCarrito,
        u.Nombre  AS Cliente,
        p.Codigo,
        p.Nombre  AS Producto,
        p.Precio,
        d.Cantidad,
        CAST(p.Precio * d.Cantidad AS DECIMAL(12,2)) AS Subtotal
FROM    dbo.Carrito ca
JOIN    dbo.Usuario u         ON u.IdUsuario = ca.IdUsuario
JOIN    dbo.DetalleCarrito d  ON d.IdCarrito = ca.IdCarrito
JOIN    dbo.Producto p        ON p.Codigo = d.CodigoProducto;
GO

/* =====================================================================
   9. COMPROBACIÓN
   Esperado: Rol 2, EstadoProducto 3, EstadoPedido 4, Usuario 2,
             Categoria 6, Producto 8, Pedido 0, Carrito 0
   ===================================================================== */
SELECT 'Rol' AS Tabla, COUNT(*) AS Filas FROM dbo.Rol
UNION ALL SELECT 'EstadoProducto', COUNT(*) FROM dbo.EstadoProducto
UNION ALL SELECT 'EstadoPedido',   COUNT(*) FROM dbo.EstadoPedido
UNION ALL SELECT 'Usuario',        COUNT(*) FROM dbo.Usuario
UNION ALL SELECT 'Categoria',      COUNT(*) FROM dbo.Categoria
UNION ALL SELECT 'Producto',       COUNT(*) FROM dbo.Producto
UNION ALL SELECT 'Pedido',         COUNT(*) FROM dbo.Pedido
UNION ALL SELECT 'Carrito',        COUNT(*) FROM dbo.Carrito;

SELECT * FROM dbo.vw_ProductoDetalle;
GO
