require('dotenv').config();
const express = require('express');
const fs = require('fs');
const algosdk = require('algosdk');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const PURESTAKE_API_KEY = process.env.PURESTAKE_API_KEY;
const MNEMONIC = process.env.MNEMONIC;


const baseServer = 'https://testnet-algorand.api.purestake.io/ps2';
const port1 = '';

const token = {
    'X-API-key': PURESTAKE_API_KEY,
};
let algodClient = new algosdk.Algodv2(token, baseServer, port1);


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

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
