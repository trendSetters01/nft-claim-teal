const express = require('express');
const router = express.Router();
const { algodClient } = require('../config');

router.get('/account-info/:address', async (req, res) => {
    const { address } = req.params;

    try {
        const accountInfo = await algodClient.accountInformation(address).do();
        console.log(accountInfo)
        res.json({
            success: true,
            address: accountInfo.address,
            balance: accountInfo.amount,
        });
    } catch (error) {
        console.error("Failed to fetch account information:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;