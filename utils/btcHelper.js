var sysUtils = require('util');
var config = require('../config');
var bitcoin = require('bitcoinjs-lib');
var Insight = require('bitcore-explorers').Insight;
var btcHandler = new Insight(config.insightProvider[config.current]);
btcHandler.requestGet = sysUtils.promisify(btcHandler.requestGet);
btcHandler.requestPost = sysUtils.promisify(btcHandler.requestPost);

const CURRENT_NETWORK = bitcoin.networks[config.network.BTC[config.current]];
const DEFAULT_FEES = 50000;

Number.prototype.toSatoshi = function () {
    if (isNaN(this))
        return NaN;
    if (this === 0)
        return 0;
    var str = this.toString();
    var sign = (str.indexOf('-') === 0) ? "-" : "";
    str = str.replace(/^-/, '');
    if (str.indexOf('e') >= 0) {
        return parseInt(sign + str.replace(".", "").replace(/e-8/, "").replace(/e-7/, "0"), 10);
    } else {
        if (!(/\./).test(str))
            str += ".0";
        var parts = str.split(".");
        str = parts[0] + "." + parts[1].slice(0, 8);
        while (!(/\.[0-9]{8}/).test(str)) {
            str += "0";
        }
        return parseInt(sign + str.replace(".", "").replace(/^0+/, ""), 10);
    }
};


async function getUtxos(addresses = []) {
    let promiseArr = []
    addresses.map(adrr=>promiseArr.push(btcHandler.requestGet('/address/' + adrr+'/?unspent=true')))
    let utxoArray = await Promise.all(promiseArr);
    if (utxoArray.length < 1) throw new Error(' [getUtxos] Found ' + utxoArray.length + ' utxos');
    let resultArray = utxoArray.map((utxo, i) => {
        utxo = utxo.body && JSON.parse(utxo.body) && JSON.parse(utxo.body).length ? JSON.parse(utxo.body)[JSON.parse(utxo.body).length-1]:{
            address:'unknown',
            txid:'unknown',
            amount:0,
            value:0
        };
        try { bitcoin.address.fromBase58Check(utxo.address); } catch (e) { throw new Error(e); }
        //change below when rpc
        return ({
            address: utxo.address,
            txid: utxo.mintTxid,
            outputIndex:utxo.mintIndex,
            satoshis: utxo.value,
            script: utxo.script
        });
    });

    return resultArray;
}

async function createTransaction(addresses = [], toAddress, sendAmount, fees = 1000, sequenceId = 0) {
    if (addresses.length < 1 || toAddress == null || sendAmount == null) { return ({ status: false, error: 'transaction params not provided' }); }
    try {
        sendAmount = isNaN(parseInt(sendAmount)) ? 0 : parseInt(sendAmount);
        bitcoin.address.fromBase58Check(toAddress);
        let utxos = await getUtxos(addresses);
        let txBuilder = new bitcoin.TransactionBuilder(CURRENT_NETWORK);

        let sum = 0, isDone = false, vinOrder = [];
        // utxos.forEach((utxo) => { sum += utxo.amountInSatoshi || 0 });
        txBuilder.setVersion(2)
        console.log()
        utxos.map((utxo, i) => {
            sum += utxo.satoshis;
            if (!isDone) {
                if (sum >= (sendAmount + Number(fees))) {
                    txBuilder.addInput(utxo.txid, utxo.outputIndex/* , sequenceId, utxo.script */);
                    txBuilder.addOutput(utxo.address, (sum - (sendAmount + Number(fees))));
                    vinOrder.push(utxo.address);
                    isDone = true;
                    return;
                }
                if (sum <= (sendAmount + Number(fees))) {
                    txBuilder.addInput(utxo.txid, utxo.outputIndex/* , sequenceId, utxo.script */);
                    vinOrder.push(utxo.address);
                }
            }
        });
        if (!isDone){
            return ({ status: false, error: 'Not enough balance, Please provide more UTXOs' });
        }
        txBuilder.addOutput(toAddress, sendAmount);
        console.log({
            status: true,
            unsignedHex: txBuilder.buildIncomplete().toHex(),
            vinOrder: vinOrder
        });

        return ({
            status: true,
            unsignedHex: txBuilder.buildIncomplete().toHex(),
            vinOrder: vinOrder
        });
    } catch (error) {
        return ({ status: false, error: error.message || error });
    }

};

async function signTransaction(tx, privateKeys = {}) {
    if (privateKeys == null || tx == null || tx.vinOrder == null) { return ({ status: false, error: '[signTransaction] Txn params not provided' }); }
    try {
        let txObject = bitcoin.Transaction.fromHex(tx.unsignedHex);
        var unsignedTx = bitcoin.TransactionBuilder.fromTransaction(txObject, CURRENT_NETWORK);
        unsignedTx.__TX.ins.forEach((vin, i) => {
            unsignedTx.setVersion(2)
            unsignedTx.sign(i, bitcoin.ECPair.fromWIF(privateKeys[tx.vinOrder[i]], CURRENT_NETWORK));
        });
    } catch (error) {
         console.error(error); return ({ status: false, error: error.message || error }); 
        }
    console.log('signedTx', unsignedTx.build().toHex());
    return {
        status: true,
        signedHex: unsignedTx.build().toHex()
    };
}
async function signTransactionMultiSig(tx, privateKeys = [], redeemScriptHex) {
    if (privateKeys == null || tx == null) { return ({ status: false, error: '[signTransaction] Txn params not provided' }); }
    try {
        let txObject = bitcoin.Transaction.fromHex(tx.unsignedHex);
        let redeemScript = Buffer.from(redeemScriptHex, 'hex');
        var unsignedTx = bitcoin.TransactionBuilder.fromTransaction(txObject, CURRENT_NETWORK);
        unsignedTx.__tx.ins.forEach((vin, i) => {
            unsignedTx.sign(i, bitcoin.ECPair.fromWIF(privateKeys[0], CURRENT_NETWORK), redeemScript);
            unsignedTx.sign(i, bitcoin.ECPair.fromWIF(privateKeys[1], CURRENT_NETWORK), redeemScript);
        });
    } catch (error) {
        console.error(error); return ({ status: false, error: error.message || error });
    }
    console.log('signedTx', unsignedTx.build().toHex());
    return {
        status: true,
        signedHex: unsignedTx.build().toHex()
    };
}



async function getTxDetails(txHash) {
    if (txHash == null) { return ({ status: false, error: 'TxHash is null or empty' }); }
    try {
        var details = await btcHandler.requestGet('/tx/' + txHash);
        if (details.statusCode != 200) throw new Error(details.body);
        details.body=JSON.parse(details.body)
    } catch (e) {
        console.error('[getTxDetails]', e);
        return ({ status: false, error: e.message || e });
    }
    // console.log(details);
    if (details == null || details.body == null || details.body == 'Not found')
        return ({ status: false, error: 'Not found' });
    console.log('[btcHelper-getTxDetails]', details.body);
    return ({ status: true, message: (details.body) });
}


async function broadcastTransaction(serializedTx) {
    const request =  await btcHandler.requestPost('/tx/send',{rawTx:serializedTx})
    if(request.statusCode !== 200){
        return ({ status: false, error:request.body });
    }
    return ({ status: true, message: request.body });
}

async function balance(address) {
    if (address == undefined) { return ({ status: false, error: 'no address provided' }); }
    try{
    var balanceObj = await btcHandler.requestGet('/address/' + address+'/balance');
    if (balanceObj.statusCode != 200) throw new Error(balanceObj.body);
    }catch(e){
        console.error('[getBalance]', e);
        return ({ status: false, error: e.message || e });
    }
    if (balanceObj == null || balanceObj.body == null || balanceObj.body == 'Not found')
        return ({ status: false, error: 'Not found' });
    console.log('[btcHelper-getBalance]', balanceObj.body);
    
    return ({ status: true, message: JSON.parse(balanceObj.body) });
};




module.exports = {
    getUTXO: getUtxos,
    createTx: createTransaction,
    signTx: signTransaction,
    broadcastTx:broadcastTransaction,
    txDetails: getTxDetails,
    balance: balance,
    signTransactionMultiSig
};
