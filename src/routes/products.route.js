import { Router } from 'express';
import {createServicio, deleteServicio, get3RandomService, get3RandomTestimonies,
    getServices, getServicioById, getTestimonies, insertTestimonio, 
    login, registerAdmin, registerUser,
    registrarPago, getPagosPorCliente,
    updateServicio,
    registrarPagoSinpe,
    generarInforme,
    getServicesByType} from '../controllers/products.controllers.js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import pool from '../database/connection.js';
import bcrypt from 'bcryptjs';


// Configurar dotenv para cargar variables de entorno
dotenv.config();;




const router = Router();
export default router;
router.post('/login', login);
router.post('/registerUser', registerUser);
router.post('/registerAdmin', registerAdmin)
router.get('/get3RandomServices', get3RandomService);
router.get("/get3RandomTestimonies",  get3RandomTestimonies)
router.get('/getService/:codigoServicio', getServicioById);
router.get('/getServices', getServices)
router.get('/getServicesByType/:tipo', getServicesByType)
router.get('/getTestimonies', getTestimonies)
router.post('/createService', createServicio)
router.post('/updateService/:codigoServicio', updateServicio)
router.post('/createTestimonie', insertTestimonio)
// Agrega la ruta para obtener los pagos
router.get('/getPagosPorCliente/:correo', getPagosPorCliente);

router.post("/registrarPagoSinpe", registrarPagoSinpe)
router.delete('/deleteServicio/:codigoServicio', deleteServicio)

router.post('/registrarPago', registrarPago)

// Ruta para generar el informe en PDF
router.get('/generarInformePagos/:correo', generarInforme);


// Configura nodemailer para Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });
  
  // Función para generar un código de verificación y guardarlo en la base de datos
async function generarCodigoVerificacion(correo) {
    const codigo = Math.floor(100000 + Math.random() * 900000); // Código de 6 dígitos
    const fechaGeneracion = new Date();
    const fechaExpiracion = new Date(fechaGeneracion.getTime() + 15 * 60 * 1000); // 15 minutos de expiración
  
    await pool.query(
      `INSERT INTO CONTRASENA (correoUsuario, codigoVerificacion, fechaGeneracion, fechaExpiracion) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (correoUsuario) 
       DO UPDATE SET codigoVerificacion = $2, fechaGeneracion = $3, fechaExpiracion = $4`,
      [correo, codigo, fechaGeneracion, fechaExpiracion]
    );
  
    return codigo;
  }
  
  // Envío de correo con el código de verificación
  async function enviarCorreoRecuperacion(correo, codigo) {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: correo,
      subject: 'Recuperación de contraseña',
      text: `Su código de verificación es: ${codigo}. Expira en 15 minutos.`,
    };
  
    return transporter.sendMail(mailOptions);
  }
  
  // Ruta de envío de correo de recuperación
router.post('/recuperarContrasena', async (req, res) => {
    const { correo } = req.body;

    // Verifica si el campo correo está presente y es válido
    if (!correo || !correo.includes('@')) {
        return res.status(400).json({ message: 'Correo electrónico inválido o faltante.' });
    }

    try {
        const codigo = await generarCodigoVerificacion(correo);
        await enviarCorreoRecuperacion(correo, codigo);
        res.status(200).json({ message: 'Código enviado. Por favor, revisa tu correo electrónico.' });
    } catch (error) {
        console.error('Error al enviar el correo:', error.message);
        res.status(500).json({ message: 'Error al enviar el correo' });
    }
});
  // Verificación del código y cambio de contraseña
router.post('/cambiarContrasena', async (req, res) => {
    const { correo, codigo, nuevaContrasena } = req.body;
    const codigoInt = parseInt(codigo)
    // Validar que todos los campos estén presentes
    if (!correo || !codigo || !nuevaContrasena) {
      return res.status(400).json({ message: 'Todos los campos son requeridos.' });
    }
  
    try {
      // Consulta para verificar si el código existe y no ha expirado
      const result = await pool.query(
        `SELECT * FROM contrasena WHERE correousuario = $1 AND codigoverificacion = $2`,
        [correo, codigoInt]
      );
  
      // Agrega un log para ver si el código se encontró
      console.log(`Resultado de la consulta para ${correo}:`, result.rows);
  
      if (result.rows.length === 0) {
        console.log(`Código no encontrado o expirado para ${correo}. Código ingresado: ${codigoInt}`);
        return res.status(400).json({ message: 'Código de verificación incorrecto o expirado.' });
      }
  
      // Si el código es válido, se procede a cambiar la contraseña
      const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);
  
      await pool.query(
        `UPDATE USUARIO SET contrasena = $1 WHERE correo = $2`,
        [hashedPassword, correo]
      );
  
      res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
      console.error('Error al cambiar la contraseña:', error.message);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  });
  
router.get('/searchTours', async (req, res) => {
    const { query } = req.query; // El parámetro de búsqueda se envía como query string
    try {
        const result = await pool.query(
            `SELECT * FROM SERVICIO WHERE nombre ILIKE $1`, [`%${query}%`]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error en la búsqueda de tours:', error);
        res.status(500).send('Error en la búsqueda');
    }
});