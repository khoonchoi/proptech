// ExpressJS Setup
const express = require("express");
const app = express();
var bodyParser = require("body-parser");

// Hyperledger Bridge
const { Wallets, Gateway } = require("fabric-network");
const fs = require("fs");
const path = require("path");
const ccpPath = path.resolve(__dirname, "ccp", "connection-org1.json");
let ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

// Constants
const PORT = 8080;
const HOST = "0.0.0.0";

// use static file
app.use(express.static(path.join(__dirname, "views")));

// configure app to use body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// main page routing
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

async function cc_call(fn_name, args) {
    const walletPath = path.join(process.cwd(), "wallet");
    console.log(`Wallet path: ${walletPath}`);
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    console.log(`Wallet path: ${walletPath}`);

    const userExists = await wallet.get("appUser");
    if (!userExists) {
        console.log(
            'An identity for the user "appUser" does not exist in the wallet'
        );
        console.log("Run the registerUser.js application before retrying");
        return;
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: "appUser",
        discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork("mychannel");
    const contract = network.getContract("proptech");

    var result;

    if (fn_name == "Register") {

        result = await contract.submitTransaction("addUser", args[0], args[1]);
    } else if (fn_name == "Open") {
        result = await contract.submitTransaction("addRating", args[0], args[1]);
    } else if (fn_name == "Query")
        result = await contract.evaluateTransaction("readRating", args[0]);
    else result = "not supported function";

    return result;
}


app.post("/property", async (req, res) => {
    const pid = req.body.pid;
    const price = req.body.price;

    console.log("Register : " + pid, price);

    result = await cc_call("Register", [pid, price]);

    const myobj = { result: "success" };
    res.status(200).json(myobj);
});

app.post("/sale", async (req, res) => {
    const pid = req.body.pid;
    const params = req.body.params;
    console.log("Open : " + pid, params);

    result = await cc_call("Open", [pid, params]);

    const myobj = { result: "success" };
    res.status(200).json(myobj);
});

// find mate
app.get("/property", async (req, res) => {
    const pid = req.param.pid;
    console.log("query pid: " + pid);

    result = await cc_call("Query", pid);
    console.log("result: " + result.toString());
    const myobj = JSON.parse(result, "utf8");

    res.status(200).json(myobj);
});

// server start
app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
