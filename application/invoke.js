/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

const { Gateway, Wallets } = require("fabric-network");
const fs = require("fs");
const path = require("path");

async function main() {
    try {
        // load the network configuration
        const ccpPath = path.resolve(__dirname, "ccp", "connection-org1.json");
        let ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get("appUser");
        if (!identity) {
            console.log(
                'An identity for the user "appUser" does not exist in the wallet'
            );
            console.log("Run the registerUser.js application before retrying");
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser",
            discovery: { enabled: true, asLocalhost: true },
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork("mychannel");

        // Get the contract from the network.
        const contract = network.getContract("proptech");

        // Submit the specified transaction.

        // addUser Test : "invoketest@gmail.com"
        await contract.submitTransaction("Register", "P10001", "1000000000");
        console.log("Transaction has been submitted");
        // setTimeout(function () {}, 1000);

        var result = await contract.evaluateTransaction(
            "Query",
            "P10001"
        );
        console.log(
            `Transaction has been evaluated, result is: ${result.toString()}`
        );
        // setTimeout(function () {}, 1000);

        // addRating Test1 : "invoketest@gmail.com"-testproj1
        await contract.submitTransaction(
            "Open",
            "P10001",
            "1000"
        );
        console.log("Transaction has been submitted : Open Test1");
        // setTimeout(function () {}, 1000);

        // query : "invoketest@gmail.com"
        result = await contract.evaluateTransaction(
            "Query",
            "P10001"
        );
        console.log(
            `Transaction has been evaluated, result is: ${result.toString()}`
        );

        // Disconnect from the gateway.
        await gateway.disconnect();
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();
