'use strict';
var btcHelper = require('../utils/btcHelper');
var offlineTool = require('../utils/offlineOperations');

/**
 * 
 * @param {address} req 
 * @param {coin} req 
 */
async function balance(req, res) {
  if (req.query.address == undefined || req.query.coin == undefined) {
    res.status(400).send({ status: false, error: 'no address provided' });
    return;
  }
  var balanceRes = {};
  switch (req.query.coin.toUpperCase()) {
    case 'BTC': {
      balanceRes = await btcHelper.balance(req.query.address);
      break;
    }
    default: {
      balanceRes.status = false;
      balanceRes.error = 'coin not supported'
      break;
    }
  }
  return (balanceRes.status) ? res.status(200).send(balanceRes) : res.status(400).send(balanceRes);
}
/**
 * 
 * @param {txhash} req  
 * @param {coin} req 
 *
 */
async function txStatus(req, res) {
  if (req.query.txhash == undefined || req.query.coin == undefined) {
    res.status(400).send({ status: false, error: 'txhash or coin not given' });
    return;
  }
  var response = {};
  switch (req.query.coin.toUpperCase()) {
    case 'BTC': {
      response = await btcHelper.txDetails(req.query.txhash);
      break;
    }
    default: {
      response.status = false;
      response.error = 'coin not supported'
      break;
    }
  }
  return (response.status) ? res.status(200).json(response) : res.status(400).json(response);
}
/**
 * 
 * @param {} 
 *
 */
async function getMnemonic(req, res) {
  var response = {};
  try {
    response = await offlineTool.getMnemonic();
  } catch (error) {
    return res.status(400).json({ status: false, error: error.message || error });
  }
  return (response.status) ? res.status(200).json(response) : res.status(400).json(response);
}
/**
 * 
 * @param {extendedkey} req
 * @param {coin} req
 * @param {total} req 
 */
async function generateAddress(req, res) {
  console.log();
  if (req.body.extendedkey == undefined || req.body.coin == undefined || req.body.total == undefined) {
    res.status(400).send({ status: false, error: 'please provide all parameters' });
    return;
  }
  let response = {};
  try {
    response = await offlineTool.generateAddresses(req.body.extendedkey, req.body.coin, req.body.total);
  } catch (error) {
    res.status(400).send({ status: false, error: error.message || error });
    return;
  }
  return (response.status) ? res.status(200).json(response) : res.status(400).json(response);
}

/**
 * 
 * @param {addresses} Array   
 * @param {toAddress} string
 * @param {sendAmount} string 
 * @param {coin} string 
 * 
 */
async function createTxn(req, res) {
  if (req.body.addresses == undefined || req.body.toAddress == undefined || req.body.coin == undefined || req.body.sendAmount == undefined || req.body.addresses.length < 1) {
    res.status(400).send({ status: false, error: 'please provide all parameters' });
    return;
  }
  let response = {};
  try {
    switch (req.body.coin.toUpperCase()) {
      case 'BTC': {
        response = await btcHelper.createTx(req.body.addresses, req.body.toAddress, req.body.sendAmount);
        break;
      }
      default: {
        response.status = false;
        response.error = 'coin not supported'
        break;
      }
    }
  } catch (error) {
    res.status(400).send({ status: false, error: error.message || error });
    return;
  }
  return (response.status) ? res.status(200).json(response) : res.status(400).json(response);
}

/**
 * 
 * @param {unsignedHex} string
 * @param {vinOrder} Array 
 * @param {coin} string 
 * @param {privateKeys} Object 
 * @param {privateKeys.pubkeys} Array  
 * @param {privateKeys.privkeys} Array   
 * 
 */
async function signTxn(req, res) {
  if (req.body.unsignedHex == undefined || req.body.coin == undefined || req.body.vinOrder == undefined || req.body.privateKeys == undefined || req.body.privateKeys.pubkeys == undefined || req.body.privateKeys.privkeys == undefined) {
    res.status(400).send({ status: false, error: 'please provide all parameters' });
    return;
  }
  let response = {};
  try {
    let pubPriv = req.body.privateKeys;
    let keypairs = {};
    for (let i = 0; i < pubPriv.pubkeys.length; i++) {
      keypairs[pubPriv.pubkeys[i]] = pubPriv.privkeys[i];
    }

    switch (req.body.coin.toUpperCase()) {
      case 'BTC': {
        response = await btcHelper.signTx({
          vinOrder: req.body.vinOrder, unsignedHex: req.body.unsignedHex
        }, keypairs);
        break;
      }
      default: {
        response.status = false;
        response.error = 'coin not supported'
        break;
      }
    }
  } catch (error) {
    res.status(400).send({ status: false, error: error.message || error });
    return;
  }
  return (response.status) ? res.status(200).json(response) : res.status(400).json(response);
}

/**
 * 
 * @param {coin} string 
 * @param {mnemonic} string 
 * 
 */
async function importMnemonic(req, res) {
  if (req.body.mnemonic == undefined || req.body.coin == undefined) {
    res.status(400).send({ status: false, error: 'no address provided' });
    return;
  }
  let response = {};
  try {
    response = await offlineTool.importMnemonic(req.body.mnemonic, req.body.coin.toUpperCase());
  } catch (error) {
    res.status(400).send({ status: false, error: error.message || error });
    return;
  }
  return (response.status) ? res.status(200).send(response) : res.status(400).send(response);
}
module.exports = {
  balance: balance,
  tx: txStatus,
  getMnemonic: getMnemonic,
  importAccount: importMnemonic,
  generateAddress: generateAddress,
  createTxn: createTxn,
  signTxn: signTxn
};