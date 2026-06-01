-- 1. Crear tabla de Cargos (para normalizar el puesto de trabajo)
CREATE TABLE cargos (
    id_cargo INT AUTO_INCREMENT PRIMARY KEY,
    nombre_cargo VARCHAR(50) UNIQUE NOT NULL
);

-- 2. Crear tabla de Empleados (conectando con tu tabla de roles y cargos)
CREATE TABLE empleados (
    id_empleado INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    dui VARCHAR(10) UNIQUE NOT NULL,
    nit VARCHAR(17) UNIQUE NOT NULL,
    id_cargo INT NOT NULL,
    id_rol INT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cargo) REFERENCES cargos(id_cargo),
    -- Asumiendo que tu tabla de roles ya existe y su PK es id_rol
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol) 
);