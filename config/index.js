const algosdk = require('algosdk');
const cors = require('cors');
require('dotenv').config();




// Setup Algorand client
const algodToken = {
    'X-API-Key': process.env.PURESTAKE_API_KEY
};

const algodServer = "https://testnet-algorand.api.purestake.io/ps2";
const algodPort = "";
const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

// Setup CORS
const corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200
};

module.exports = { algodClient, corsOptions };
