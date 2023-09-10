const express = require('express');
const fs = require('fs');
const router = express.Router();
const { algodClient, generatedAccount } = require('../config');
const algosdk = require('algosdk');


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
        const transaction = algosdk.makeApplicationCreateTxn(sender.addr, suggestedParams,
            algosdk.OnApplicationComplete.NoOpOC, approvalProgram, clearProgram,
            localInts, localBytes, globalInts, globalBytes);

        const signedTxn = transaction.signTxn(sender.sk);
        await algodClient.sendRawTransaction(signedTxn).do();
        return transaction.txID().toString();
    } catch (error) {
        console.error("Failed to deploy smart contract:", error);
        return null;
    }
}


router.post('/deploy', async (req, res) => {
    console.log('hello')
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

module.exports = router;
