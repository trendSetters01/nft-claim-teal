require('dotenv').config();
const express = require('express');
const path = require('path');
const algosdk = require('algosdk');
const app = express();
const cors = require('cors');
const { algodClient, corsOptions } = require('./config');
const deployRoute = require('./routes/deploy');
const PORT = process.env.PORT || 3001;
app.use(express.json());

app.use(cors(corsOptions));

app.use(deployRoute);


app.get('/account-info/:address', async (req, res) => {
    const { address } = req.params;

    try {
        const accountInfo = await algodClient.accountInformation(address).do();
        console.log(accountInfo)
        res.json({
            success: true,
            address: accountInfo.address,
            balance: accountInfo.amount,  // in microAlgos
            // Add other fields as required
        });
    } catch (error) {
        console.error("Failed to fetch account information:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


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


// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'my-react-app/build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/my-react-app/build/index.html'));
});


app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
