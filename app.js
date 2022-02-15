const fs = require('fs');
const express = require('express');
const exceljs = require('exceljs');
const cors = require('cors');

const { Client, MessageMedia } = require("whatsapp-web.js");
const qrcode = require('qrcode-terminal');
const { ClientRequest } = require('http');
const { stringify } = require('querystring');

const SESSION_FILE_PATH = './session.json';
let client;
let sessionData;


//TODO: arreglar el express 55:44
// const app = express();

// app.use(cors());
// app.use(express.urlencoded({ extended: true }));


const sendWhithApi = (req, res) => {
    const { message, to } = req.body;
    const newNumber = `${to}@c.us`;
    console.log(message, to);

    sendMessage(newNumber, message);

    res.send({ status: 'Enviado' });
}

// app.post('/send', sendWhithApi)


// Fn para conectar con el Json de la sesion
const withSession = () => {
    //Carga del archivo con credenciales
    console.log('Cargando: Validadon sesion con Whatsapp... ');
    sessionData = require(SESSION_FILE_PATH);
    client = new Client({
        session: sessionData
    });

    client.on('ready', () => {
        console.log("Conectado al WhatsApp");
        listenMessage();
    });

    client.on('auth_failure', () => {
        console.log('el QR se va vencido, debe generar uno nuevo');
        fs.rmSync(SESSION_FILE_PATH);
        withSession();
    });

    client.initialize();

}


//Fn para generar QR code y guardarlo en Json
const whitOutSession = () => {

    console.log("No hay una sesion guardada");
    client = new Client();
    client.on('qr', (qr) => {
        qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', (session) => {
        console.log("Conectado al WhatsApp");
        listenMessage();

        // Guarda credenciales para prox uso
        sessionData = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
            if (err) {
                console.log(err);
            }
        });
    });

    client.initialize();

}

// Escuchar mesanges
const listenMessage = () => {
    client.on('message', (msg) => {
        //Destructuramos el mensage recibido
        const { from, to, body } = msg;

        console.log('De: ', from, 'Para: ', to, 'Mensage: ', body);

        pruebas(from, body.toString());

    });
}


// envio Multimedia
const sendMedia = (to, file) => {
    const mediaFile = MessageMedia.fromFilePath(`./mediaSend/${file}`);
    client.sendMessage(to, mediaFile)
}


// enviar mensage
const sendMessage = (to, message) => {
    client.sendMessage(to, message)
}


//TODO: hacerlo en JSON
// Guardar conversacion - Crea un archivo de excel 
const saveHistorial = (number, message) => {
    const pathChat = `./historial/${number}.xlsx`;
    const workBook = new exceljs.Workbook();
    const today = new Date();

    if (fs.existsSync(pathChat)) {
        //leo el path
        workBook.xlsx.readFile(pathChat)
            .then(() => {
                const workSheet = workBook.getWorksheet(1);
                const lastRow = workSheet.lastRow;
                let getRowInsert = workSheet.getRow(++(lastRow.number))
                getRowInsert.getCell('A').value = today;
                getRowInsert.getCell('B').value = message;
                getRowInsert.commit();
                workBook.xlsx.writeFile(pathChat).then(() => {
                    console.log('Chat agregado al registro al historial')
                }).catch(() => {
                    console.log('Error al guardar el chat en el historial')
                })
            })

    } else {
        // Creo y defino los encabezados de la hoja de excel
        const workSheet = workBook.addWorksheet('./historial');
        workSheet.columns = [
                { header: 'Fecha', key: 'date' },
                { header: 'Mensaje', key: 'message' }
            ]
            // Agrego la info a la tabla
        workSheet.addRow([today, message]);
        //guarda el archivo
        workBook.xlsx.writeFile(pathChat)
            .then(() => {
                console.log('Historial creado!!  ');
            })
            .catch(() => {
                console.log('Error al guardar el historial!! ')
            })
    }

}

// Enviar mensaje por archivo excel
const sendListExcel = () => {

    const pathList = './lista.xlsx';
    const workBook = new exceljs.Workbook();

    if (fs.existsSync(pathList)) {
        workBook.xlsx.readFile(pathList)
            .then(() => {
                const workSheet = workBook.getWorksheet(1);
                // ultimo registro
                const n = workSheet.lastRow.number;

                // Itero el numero de filas
                for (i = 0; i < n; i++) {
                    // indico la fila
                    let getRow = workSheet.getRow(i + 1);
                    let number = parseInt(getRow.getCell('A').value);
                    let message = getRow.getCell('B').value.toString();

                    sendMessage(`${number}@c.us`, message);
                    console.log(number, message);

                }



                console.log(n);

            });
    } else {

    }
}

// Prueba de respuesta mensage
const pruebas = (to, body) => {

    switch (body) {
        case "MSG1":
            sendMessage(to, 'Este es el primer mensage de prueba del bot-WatsApp')
            break;
        case "MSG2":
            sendMessage(to, 'Este es el Segundo mensage de prueba del bot-WatsApp')
            break;
        case "MSG3":
            sendMessage(to, 'Este es el 3 mensage de prueba del bot-WatsApp')
                // imagen
            sendMedia(to, 'msg3.png')
            break;
        case "Adios":
            sendMessage(to, '(y)')
            saveHistorial(to, body)
            break;
        case "MSG5":
            sendListExcel()
            break;
    }

    //saveHistorial(to, body);


}


(fs.existsSync(SESSION_FILE_PATH)) ? withSession(): whitOutSession();

// const port = 9000;
// app.listen(port, () => {
//     console.log('Api funcionando en el puerto: ', port)
// })