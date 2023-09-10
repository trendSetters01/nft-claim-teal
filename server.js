require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const algosdk = require('algosdk');
const app = express();
const cors = require('cors');
const { algodClient, corsOptions } = require('./config');

const PORT = process.env.PORT || 3001;
app.use(express.json());

app.use(cors(corsOptions));


const MNEMONIC = process.env.MNEMONIC;


const generatedAccount = algosdk.mnemonicToSecretKey(MNEMONIC);

console.log(`My address: ${generatedAccount.addr}`);
console.log(`My sk: ${generatedAccount.sk}`);

async function compileTeal(tealCode) {
    try {
        const compiledCodeInfo = await algodClient.compile(tealCode).do();
        return compiledCodeInfo;
    } catch (error) {
        console.error("Failed to compile TEAL:", error);
        return null;
    }
}

async function deploySmartContract(sender, approvalProgram, clearProgram) {
    const localInts = 1;
    const localBytes = 3;
    const globalInts = 1;
    const globalBytes = 0;

    try {
        const suggestedParams = await algodClient.getTransactionParams().do();
        approvalProgram = new Uint8Array(Buffer.from(approvalProgram, "base64"));
        clearProgram = new Uint8Array(Buffer.from(clearProgram, "base64"));
        console.log("Approval:", approvalProgram);
        console.log("Clear:", clearProgram);
        const transaction = algosdk.makeApplicationCreateTxn(generatedAccount.addr, suggestedParams,
            algosdk.OnApplicationComplete.NoOpOC, approvalProgram, clearProgram,
            localInts, localBytes, globalInts, globalBytes);

        const signedTxn = transaction.signTxn(generatedAccount.sk);
        await algodClient.sendRawTransaction(signedTxn).do();
        return transaction.txID().toString();
    } catch (error) {
        console.error("Failed to deploy smart contract:", error);
        return null;
    }
}

app.post('/deploy', async (req, res) => {
    const approvalTeal = fs.readFileSync("./teal_scripts/approval.teal", "utf8");

    const clearTeal = fs.readFileSync("./teal_scripts/clear_state.teal", "utf8");

    // Compile the TEAL scripts
    const compiledApproval = await compileTeal(approvalTeal);
    const compiledClear = await compileTeal(clearTeal);


    if (!compiledApproval || !compiledClear) {
        return res.status(500).json({ success: false, message: "Failed to compile TEAL scripts." });
    }

    // Deploy the smart contract
    const txId = await deploySmartContract(generatedAccount, compiledApproval.result, compiledClear.result);

    if (!txId) {
        return res.status(500).json({ success: false, message: "Failed to deploy the smart contract." });
    }

    res.json({ success: true, txId });
});

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
