
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import pool from '../database/connection.js';
import pdfkit from 'pdfkit';

// Seccion de Registo
export const login = async (req, res) => {
    try {
        const { correo, contrasena } = req.body;

        // Validar que los campos no estén vacíos
        if (!correo || !contrasena) {
            return res.status(400).json({ message: 'Por favor, complete ambos campos.' });
        }

        // Verificar si el usuario existe
        const userResult = await pool.query('SELECT * FROM usuario WHERE correo = $1', [correo]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }

        // Verificar la contraseña
        const validPassword = await bcrypt.compare(contrasena, user.contrasena);
        if (!validPassword) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }

        // Crear el token con el rol
        const rol = user.rol === 1 ? 'admin' : 'cliente';
        const token = jwt.sign({ id: user.id, rol }, process.env.SECRET_KEY, {
            expiresIn: '1h'
        });

        // Responder con el token y un mensaje adecuado
        console.log(token)
        return res.status(200).json({ token, message: `Acceso concedido como ${rol}` });

    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
};


export const logout = async (req, res) => {
    // Cerrar sesión
    res.json('Sesión cerrada');
}


// Función común para registrar usuario o administrador
const registerUserCommon = async (req, res, rol) => {
    try {
        const { correo, nombre, contraseña } = req.body;

        // Validación básica de entradas
        if (!correo || !nombre || !contraseña) {
            return res.status(400).json({ message: 'Por favor, complete todos los campos.' });
        }

        // Verificar si el correo ya está registrado
        const userExists = await pool.query('SELECT * FROM usuario WHERE correo = $1', [correo]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'El correo ya está registrado.' });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        // Insertar nuevo usuario
        const newUser = await pool.query(
            'INSERT INTO usuario (correo, nombre, contrasena, rol) VALUES ($1, $2, $3, $4) RETURNING *',
            [correo, nombre, hashedPassword, rol]
        );

        // Generar token JWT
        const token = jwt.sign({ id: newUser.rows[0].id }, process.env.SECRET_KEY, {
            expiresIn: '1h'
        });

        // Responder con el token
        res.status(201).json({ token, message: 'Usuario registrado con éxito.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Registrar un usuario (rol 0)
export const registerUser = async (req, res) => {
    await registerUserCommon(req, res, 0);
};

// Registrar un administrador (rol 1)
export const registerAdmin = async (req, res) => {
    await registerUserCommon(req, res, 1);
};


// Seccion para servicios
export const get3RandomService = async (req, res) => {
    try {

        // Obtener 3 servicios aleatorios
        const result = await pool.query('SELECT * FROM servicio WHERE estado != 1 ORDER BY RANDOM() LIMIT 3');

        // Verificar si hay resultados
        if (result.rows.length === 0) {
            console.log("No hay servicios")
            return res.status(200).json({ message: 'No hay servicios disponibles en este momento' });
        }
        // Enviar los servicios como respuesta
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener los servicios:', err.message);
        res.status(500).json({ message: 'Error al obtener los servicios' });
    }
};




export const getServices = async (req, res) => {
    try {
        // Ejecutar la consulta para obtener todos los servicios
        const result = await pool.query('SELECT * FROM servicio WHERE estado != 1');

        // Enviar los servicios como respuesta
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener los servicios:', err.message);
        res.status(500).json({ message: 'Error al obtener los servicios' });
    }
};


export const getServicesByType = async (req, res) => {
    try {
        const { tipo } = req.params;

        // Ejecutar la consulta SQL con un parámetro
        const result = await pool.query('SELECT * FROM servicio WHERE tipo = $1 AND estado != 1', [tipo]);

        // Enviar los servicios filtrados como respuesta
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener los servicios por tipo:', err.message);
        res.status(500).json({ message: 'Error al obtener los servicios' });
    }
};

export const get3RandomTestimonies = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM testimonio ORDER BY RANDOM() LIMIT 3');

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'No hay testimonios disponibles en este momento' });
        }

        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener los testimonios:', err.message);
        res.status(500).json({ message: 'Error al obtener los testimonios' });
    }
};


export const getPagosUsuario = async (req, res) => {
    try {
        const { correoUsuario } = req.params;

        // Ejecutar la consulta SQL con el correo del usuario como parámetro
        const result = await pool.query(`
            SELECT 
                S.nombre AS "Nombre de actividad",
                P.codigoServicio AS "Código de actividad",
                CONCAT(TO_CHAR(S.horaFechaSalida, 'DD/MM/YYYY'), ' al ', TO_CHAR(S.horaFechaLlegada, 'DD/MM/YYYY')) AS "Fecha",
                TO_CHAR(P.fechaPago, 'DD-MM-YYYY') AS "Día de compra",
                S.precio AS "Precio"
            FROM 
                PAGO P
            JOIN 
                SERVICIO S ON P.codigoServicio = S.codigoServicio
            WHERE 
                P.correoUsuario = $1;
        `, [correoUsuario]);

        // Enviar los pagos como respuesta
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener los pagos:', err.message);
        res.status(500).json({ message: 'Error al obtener los pagos' });
    }
};


// Seccion de Administracion


export const insertTestimonio = async (req, res) => {
    try {
        const { nombreUsuario, comentario } = req.body;

        // Ejecutar la consulta SQL para insertar el testimonio
        const result = await pool.query(
            'INSERT INTO testimonio (nombreUsuario, comentario) VALUES ($1, $2) RETURNING *',
            [nombreUsuario, comentario]
        );

        // Devolver el testimonio insertado y un mensaje de éxito
        res.json({ message: 'Testimonio insertado exitosamente', testimonio: result.rows[0] });
    } catch (err) {
        console.error('Error al insertar el testimonio:', err.message);
        res.status(500).json({ message: 'Error al insertar el testimonio' });
    }
};

export const getTestimonies  = async (req, res) => {
    try {
        // Ejecutar la consulta SQL para obtener todos los testimonios
        const result = await pool.query('SELECT * FROM testimonio');

        // Enviar los testimonios como respuesta
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener los testimonios:', err.message);
        res.status(500).json({ message: 'Error al obtener los testimonios' });
    }
}

// TODO el boton de la imagen debe estar conectado con la API de cloudinary para la gestion de imagenes
export const createServicio = async (req, res) => {
    try {
        const {
            nombre,
            descripcion,
            textoAlternativo,
            dificultad,
            horaFechaSalida,
            horaFechaLlegada,
            tipo,
            precio,
            incluyeActividad,
            estado,
            enlaceImagen,
            cantidadPersonas
        } = req.body;

        // Ejecutar la consulta SQL para crear un nuevo servicio
        const result = await pool.query(`
            INSERT INTO servicio (nombre, descripcion, textoAlternativo, dificultad, horaFechaSalida, horaFechaLlegada, tipo, precio, incluyeActividad, estado, enlaceImagen, cantidadPersonas)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `, [
            nombre,
            descripcion,
            textoAlternativo,
            dificultad,
            horaFechaSalida,
            horaFechaLlegada,
            tipo,
            precio,
            incluyeActividad,
            estado,
            enlaceImagen,
            cantidadPersonas
        ]);

        // Enviar el servicio recién creado como respuesta
        res.json({ message: 'Servicio creado exitosamente', servicio: result.rows[0] });
    } catch (err) {
        console.error('Error al crear el servicio:', err.message);
        res.status(500).json({ message: 'Error al crear el servicio' });
    }
};


export const getServicioById = async (req, res) => {
    try {
        const { codigoServicio } = req.params;

        // Ejecutar la consulta SQL para obtener el servicio por código
        const result = await pool.query('SELECT * FROM servicio WHERE codigoServicio = $1 AND estado != 1', [codigoServicio, 'activo']);


        const servicio = result.rows[0];

        // Verificar si se encontró el servicio
        if (!servicio) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }

        // Responder con la información del servicio
        res.json(servicio);
    } catch (err) {
        console.error('Error al obtener el servicio:', err.message);
        res.status(500).json({ message: 'Error al obtener el servicio' });
    }
};


export const updateServicio = async (req, res) => {
    try {
        const { codigoServicio } = req.params;
        const {
            nombre,
            descripcion,
            textoAlternativo,
            dificultad,
            horaFechaSalida,
            horaFechaLlegada,
            tipo,
            precio,
            incluyeActividad,
            estado,
            enlaceImagen,
            cantidadPersonas
        } = req.body;

        // Ejecutar la consulta SQL para actualizar el servicio
        const result = await pool.query(`
            UPDATE servicio
            SET nombre = $1,
                descripcion = $2,
                textoAlternativo = $3,
                dificultad = $4,
                horaFechaSalida = $5,
                horaFechaLlegada = $6,
                tipo = $7,
                precio = $8,
                incluyeActividad = $9,
                estado = $10,
                enlaceImagen = $11,
                cantidadPersonas = $12
            WHERE codigoServicio = $13
        `, [
            nombre,
            descripcion,
            textoAlternativo,
            dificultad,
            horaFechaSalida,
            horaFechaLlegada,
            tipo,
            precio,
            incluyeActividad,
            estado,
            enlaceImagen,
            cantidadPersonas,
            codigoServicio
        ]);

        // Verificar si se actualizó algún registro
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }

        // Responder con un mensaje de éxito
        res.json({ message: 'Servicio actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar el servicio:', err.message);
        res.status(500).json({ message: 'Error al actualizar el servicio' });
    }
};


export const deleteServicio = async (req, res) => {
    try {
        const { codigoServicio } = req.params;

        // Ejecutar la consulta SQL para actualizar el estado del servicio
        const result = await pool.query('UPDATE servicio SET estado = 1 WHERE codigoServicio = $1', [codigoServicio]); 

        // Verificar si se actualizó algún registro
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }

        // Responder con un mensaje de éxito
        res.json({ message: 'Estado del servicio actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar el estado del servicio:', err.message);
        res.status(500).json({ message: 'Error al actualizar el estado del servicio' });
    }
};


export const registrarPago = async (req, res) => {
    try {
        const { codigoServicio, monto, metodoPago, correoUsuario } = req.body;

        // Validar los campos obligatorios
        if (!codigoServicio || !monto || !metodoPago || !correoUsuario) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
        }

        // Validar el método de pago (0 = SINPE, 1 = Tarjeta)
        if (![0, 1].includes(metodoPago)) {
            return res.status(400).json({ message: 'Método de pago no válido. Debe ser 0 (SINPE) o 1 (Tarjeta).' });
        }

        // Validar que el servicio exista
        const servicio = await pool.query('SELECT * FROM SERVICIO WHERE codigoServicio = $1', [codigoServicio]);
        if (servicio.rows.length === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado.' });
        }

        // Validar que el usuario exista
        const usuario = await pool.query('SELECT * FROM USUARIO WHERE correo = $1', [correoUsuario]);
        if (usuario.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Insertar el pago en la base de datos
        const fechaPago = new Date(); // Fecha del momento actual
        const result = await pool.query(`
            INSERT INTO PAGO (codigoServicio, fechaPago, monto, metodoPago, correoUsuario)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [codigoServicio, fechaPago, monto, metodoPago, correoUsuario]);

        // Responder con el resultado del pago registrado
        res.status(201).json({ message: 'Pago registrado exitosamente', pago: result.rows[0] });
    } catch (err) {
        console.error('Error al registrar el pago:', err.message);
        res.status(500).json({ message: 'Error en el servidor al registrar el pago.' });
    }
};
export const getPagosPorCliente = async (req, res) => {
    try {
        // Obtener el correo del cliente desde los parámetros de la URL
        const { correo } = req.params;

        // Verificar que el correo no sea vacío
        if (!correo) {
            return res.status(400).json({ message: 'El correo del cliente es requerido.' });
        }

        // Realizar la consulta para obtener los pagos del cliente
        const result = await pool.query(`
            SELECT 
                S.nombre AS "Nombre de actividad",
                P.codigoServicio AS "Código de actividad",
                CONCAT(TO_CHAR(S.horaFechaSalida, 'DD/MM/YYYY'), ' al ', TO_CHAR(S.horaFechaLlegada, 'DD/MM/YYYY')) AS "Fecha",
                TO_CHAR(P.fechaPago, 'DD-MM-YYYY') AS "Día de compra",
                P.monto AS "Precio"
            FROM 
                PAGO P
            JOIN 
                SERVICIO S ON P.codigoServicio = S.codigoServicio
            WHERE 
                P.correoUsuario = $1;
        `, [correo]);

        // Enviar los resultados como respuesta
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error al obtener los pagos del cliente:', err.message);
        res.status(500).json({ message: 'Error al obtener los pagos del cliente' });
    }
};

export const registrarPagoSinpe = async (req, res) => {
    try {
        const { codigoServicio, correoUsuario, fechaPago, metodoPago, monto, numComprobante, mensaje } = req.body;

        // Validar los datos recibidos
        if (!codigoServicio || !correoUsuario || !numComprobante) {
            return res.status(400).json({ message: 'Faltan campos obligatorios.' });
        }

        // Insertar el pago en la base de datos
        const result = await pool.query(`
            INSERT INTO PAGO (codigoServicio, fechaPago, metodoPago, monto, correoUsuario)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING idPago;
        `, [codigoServicio, fechaPago, metodoPago, monto, correoUsuario]);

        // Verificar si el pago se registró correctamente
        if (result.rowCount === 0) {
            return res.status(500).json({ message: 'No se pudo registrar el pago.' });
        }

        // Enviar una respuesta exitosa
        res.status(201).json({ message: 'Pago registrado exitosamente', pagoId: result.rows[0].idPago });
    } catch (err) {
        console.error('Error al registrar el pago:', err.message);
        res.status(500).json({ message: 'Error en el servidor al registrar el pago.' });
    }
};

export const generarInforme = async (req, res) => {
    const { correo } = req.params;

    try {
        // Realizar la consulta para obtener los pagos del cliente
        const result = await pool.query(`
            SELECT 
                S.nombre AS "Nombre de actividad",
                P.codigoServicio AS "Código de actividad",
                CONCAT(TO_CHAR(S.horaFechaSalida, 'DD/MM/YYYY'), ' al ', TO_CHAR(S.horaFechaLlegada, 'DD/MM/YYYY')) AS "Fecha",
                TO_CHAR(P.fechaPago, 'DD-MM-YYYY') AS "Día de compra",
                P.monto AS "Precio"
            FROM 
                PAGO P
            JOIN 
                SERVICIO S ON P.codigoServicio = S.codigoServicio
            WHERE 
                P.correoUsuario = $1;
        `, [correo]);

        const pagos = result.rows;

        // Crear el PDF usando pdfkit
        const doc = new pdfkit();
        let filename = `informe_pagos_${correo}.pdf`;
        
        // Configurar la cabecera para descargar el archivo
        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res); // Enviar el PDF directamente al navegador

        // Crear el contenido del PDF
        doc.fontSize(25).text('Informe de Pagos', { align: 'center' });
        doc.moveDown();
        
        pagos.forEach((pago, index) => {
            doc.fontSize(14).text(`Pago ${index + 1}:`);
            doc.fontSize(12).text(`Nombre de actividad: ${pago['Nombre de actividad']}`);
            doc.text(`Código de actividad: ${pago['Código de actividad']}`);
            doc.text(`Fecha: ${pago['Fecha']}`);
            doc.text(`Día de compra: ${pago['Día de compra']}`);
            doc.text(`Precio en colones: ${pago['Precio']}`);
            doc.moveDown();
        });
        
        doc.end(); // Finalizar el PDF
    } catch (err) {
        console.error('Error al generar el informe de pagos:', err.message);
        res.status(500).json({ message: 'Error al generar el informe de pagos' });
    }
}
