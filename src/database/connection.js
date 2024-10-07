import Pool  from 'pg';
import dotenv from 'dotenv'; 
dotenv.config()// Carga las variables del archivo .env

//conectarse a la db de postgreSQL

const pool = new Pool.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


pool.on('connect', () => {

    console.log('Conectado a la base de datos');
});

pool.on('error', (err) => {
    console.error('Error en la conexión de la base de datos:', err);
});

export const getConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('Conexión exitosa');
        const databaseName = await pool.query(
            'SELECT current_database()'
        );
        console.log('Base de datos:', databaseName.rows[0].current_database);
        client.release();
    } catch (err) {
        console.error('Error en la conexión de la base de datos:', err);
    }
}
export const listDatabases = async () => {
    try {
        const client = await pool.connect();
        console.log('Conexión exitosa');
        
        // Ejecutar consulta para listar las bases de datos
        const res = await client.query('SELECT datname FROM pg_database');
        
        console.log('Bases de datos:');
        res.rows.forEach(row => {
            console.log(row.datname);
        });
        
        client.release();
    } catch (err) {
        console.error('Error al listar las bases de datos:', err);
    }
};
export const createTestTable = async () => {
    try {
        const client = await pool.connect();
        console.log('Conexión exitosa');
        
        // Crear tabla de prueba
        await client.query(
            'CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name TEXT NOT NULL)'
        );
        
        console.log('Tabla de prueba creada');
        
        client.release();
    } catch (err) {
        console.error('Error al crear la tabla de prueba:', err);
    }
}
export const executeTables = async () => {
    try {
        const client = await pool.connect();
        console.log('Conexión exitosa');
        
        // Crear varias tablas de prueba
        await client.query(
            `CREATE TABLE SERVICIO (
                codigoServicio SERIAL PRIMARY KEY,
                nombre VARCHAR(100),
                descripcion VARCHAR(500),
                textoAlternativo VARCHAR(255),
                dificultad VARCHAR(50),
                horaFechaSalida TIMESTAMP,
                horaFechaLlegada TIMESTAMP,
                tipo SMALLINT,
                precio DECIMAL(10, 2),
                incluyeActividad VARCHAR(500),
                estado SMALLINT,
                enlaceImagen VARCHAR(100)
            );

            -- Tabla USUARIO
            CREATE TABLE USUARIO (
                correo VARCHAR(75) PRIMARY KEY,
                nombre VARCHAR(100),
                contrasena VARCHAR(60),
                rol SMALLINT
            );

            -- Tabla PAGO
            CREATE TABLE PAGO (
                idPago SERIAL PRIMARY KEY,
                codigoServicio INT,
                fechaPago TIMESTAMP,
                monto DECIMAL(10, 2),
                metodoPago SMALLINT,
                correoUsuario VARCHAR(75),
                FOREIGN KEY (codigoServicio) REFERENCES SERVICIO(codigoServicio),
                FOREIGN KEY (correoUsuario) REFERENCES USUARIO(correo)
            );

            -- Tabla CONTRASENA
            CREATE TABLE CONTRASENA (
                idContrasena SERIAL PRIMARY KEY,
                correoUsuario VARCHAR(75),
                codigoVerificacion INT,
                estadoCodigo SMALLINT,
                fechaGeneracion TIMESTAMP,
                fechaExpiracion TIMESTAMP,
                FOREIGN KEY (correoUsuario) REFERENCES USUARIO(correo)
            );

            -- Tabla TESTIMONIO
            CREATE TABLE TESTIMONIO (
                idTestimonio SERIAL PRIMARY KEY,
                nombreUsuario VARCHAR(50),
                comentario VARCHAR(1000)
            );`
            
        );
        
        console.log('Tablas de prueba creada');
        
        client.release();
    } catch (err) {
        console.error('Error al crear la tabla de prueba:', err);
    }
}

export const alterTables = async () => {
    try {
        const client = await pool.connect();
        console.log('Conexión exitosa');
        // Alterar tablas de prueba
        await client.query(`
            SELECT * FROM CONTRASENA WHERE correoUsuario = 'asnaranjom@gmail.com';
        `);
        
        console.log('Tablas de prueba alteradas');
        
        client.release();
    } catch (err) {
        console.error('Error al alterar las tablas de prueba:', err);
    }
}


export const showTables = async () => {
    try {
        const client = await pool.connect();
        console.log('Conexión exitosa');
        
        // Ejecutar consulta para mostrar las tablas
        const res = await client.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
        );
        
        console.log('Tablas:');
        res.rows.forEach(row => {
            console.log(row.table_name);
        });
        
        client.release();
    } catch (err) {
        console.error('Error al mostrar las tablas:', err);
    }
}

//saber en cual puerto esta corriendo el server
export const PORT = process.env.PORT || 1434;

//exportar la conexion
export default pool;