require('dotenv').config();

const path = require('path');
const algosdk = require('algosdk');
const { algodClient, corsOptions } = require('./config');

const express = require('express');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3001;

const deployRoute = require('./routes/deploy');
const accountInfoRoute = require('./routes/account-info');

app.use(express.json());

app.use(cors(corsOptions));

app.use(deployRoute);

app.use(accountInfoRoute);

app.post('/claim-nft', async (req, res) => {
    const rawSignedTxn = req.body.signedTxn;  // The signed transaction from the frontend

    try {
        const sendTx = await algodClient.sendRawTransaction(rawSignedTxn).do();
        res.json({ success: true, txId: sendTx.txId });

    } catch (error) {
        console.error("Failed to claim NFT:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
