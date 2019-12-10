var bip39 = require("bip39");
var hdkey = require("hdkey");
var bitcoin = require("bitcoinjs-lib");
var ethereumUtils = require('ethereumjs-util');

var config = require("../config");
const { signTx, createTx, broadcastTx } = require("./btcHelper");
const {
  create_wallet,
  getWalletByAddress,
  create_trx
} = require("./mongo_uils");
const CHAIN_TYPE = {
  RECEIVE: { BTC: 0, ETH: 0 },
  CHANGE: { BTC: 0, ETH: 1 }
};
var MAX_GENERATOR_LIMIT = 100;
var SUPPORTED_COINS = ["BTC", "ETH"];
var getCurrentNetwork = coinType => {
  let CURRENT_NETWORK = "",
    CURRENT_NETWORK_VERSION = "";
  switch (coinType.toUpperCase()) {
    case "BTC":
      let btcConfig = config.network.BTC;
      CURRENT_NETWORK = bitcoin.networks[btcConfig[btcConfig.current]];
      CURRENT_NETWORK_VERSION =
        bitcoin.networks[btcConfig[btcConfig.current]].bip32;
      break;
    //Can extend with eth and all
    case "ETH":
      CURRENT_NETWORK = "";
      CURRENT_NETWORK_VERSION = "";
      break;
    default:
      CURRENT_NETWORK = "";
      CURRENT_NETWORK_VERSION = "";
      break;
  }
  return {
    CURRENT_NETWORK: CURRENT_NETWORK,
    CURRENT_NETWORK_VERSION: CURRENT_NETWORK_VERSION
  };
};
var addressDerivation = {
  BTC: function(xpub, index) {
    let pubKey = bitcoin.bip32
      .fromBase58(xpub, getCurrentNetwork("BTC").CURRENT_NETWORK)
      .derive(index).publicKey;
    return bitcoin.payments.p2pkh({
      pubkey: pubKey,
      network: getCurrentNetwork("BTC").CURRENT_NETWORK
    }).address;
  },
  ETH: function(xpub, index) {
    let account = hdkey.fromExtendedKey(xpub).deriveChild(index)._publicKey;
    let nonCheckSumAddress = ethereumUtils
      .publicToAddress(account, true)
      .toString("hex");
    return ethereumUtils.toChecksumAddress(nonCheckSumAddress);
  }
};

async function importAccFromMnemonic(mnemonic, coinType) {
  if (!bip39.validateMnemonic(mnemonic))
    return { status: false, error: "Invalid 12 words mnemonic string" };

  let purpose = 44,
    coin = "",
    accountIndex = 0,
    chainType = 0; //External = 0 (receiving addresses); Internal =1 (change addresses);
  let path = "m/";
  var account = {
    coin: coinType.toUpperCase(),
    mnemonicPhrase: "",
    accountXpriv: "",
    accountXpub: "",
    addressDerivationXpub: "",
    addresses: []
  };
  switch (coinType.toUpperCase()) {
    case "BTC": {
      coin = 0;
      accountIndex = 0;
      path += purpose + "'/";
      path += coin + "'/";
      path += accountIndex + "'";
      let mnemonicString = mnemonic;
      let hdNode = bitcoin.bip32.fromSeed(
        bip39.mnemonicToSeed(mnemonicString),
        getCurrentNetwork(coinType).CURRENT_NETWORK
      );
      let xprivImport = hdNode.derivePath(path).toBase58();
      let xpubImport = hdNode
        .derivePath(path)
        .neutered()
        .toBase58();
      let neuteredXpub = hdkey
        .fromExtendedKey(
          xpubImport,
          getCurrentNetwork(coinType).CURRENT_NETWORK_VERSION
        )
        .deriveChild(chainType)
        .toJSON().xpub;

      let receivingAddresses = await generateAddressesFromXpub(
        neuteredXpub,
        coinType.toUpperCase(),
        config.DEPTH_INDEX
      );
      account.mnemonicPhrase = mnemonicString;
      account.accountXpriv = xprivImport.toString();
      account.accountXpub = xpubImport.toString();
      account.addressDerivationXpub = neuteredXpub;
      account.addresses = receivingAddresses;
      account.WIFKEY = hdNode.toWIF();
      break;
    }
    case "ETH": {
      coin = 60;
      accountIndex = 0;
      path += purpose + "'/";
      path += coin + "'/";
      path += accountIndex + "'";
      let mnemonicString = mnemonic;
      let hdNode = bitcoin.bip32.fromSeed(
        bip39.mnemonicToSeed(mnemonicString)
      );
      let xprivImport = hdNode.derivePath(path).toBase58();
      let xpubImport = hdNode
        .derivePath(path)
        .neutered()
        .toBase58();
      let neuteredXpub = hdkey
        .fromExtendedKey(xpubImport)
        .deriveChild(chainType)
        .toJSON().xpub;
      let receivingAddresses = await generateAddressesFromXpub(
        neuteredXpub,
        coinType.toUpperCase(),
        config.DEPTH_INDEX
      );
      account.mnemonicPhrase = mnemonicString;
      account.accountXpriv = xprivImport.toString();
      account.accountXpub = xpubImport.toString();
      account.addressDerivationXpub = neuteredXpub;
      account.addresses = receivingAddresses;
      account.WIFKEY = hdNode.toWIF();
      break;
    }
    default: {
      return { status: false, error: "No such coin supported" };
      break;
    }
  }
  await create_wallet(
    coinType.toUpperCase(),
    config.DEPTH_INDEX,
    Date.now(),
    account.addresses.publicAddress,
  );
  console.log("[offlineTool-generateAccount]", account);
  return { status: true, message: account };
}

function mnemonicGenerate() {
  let generatedMnemonic = bip39.generateMnemonic();
  return bip39.validateMnemonic(generatedMnemonic)
    ? generatedMnemonic.toString()
    : "";
}

function generateAddressesFromXpub(neuteredXpub, coinType, index) {
  console.log("generateAddressesFromXpub(", coinType, index);
  if (
    neuteredXpub == null ||
    parseInt(index) < 0 ||
    coinType == null ||
    !SUPPORTED_COINS.includes(coinType.toUpperCase())
  )
    throw new Error("XPUB length");

  if (
    hdkey.fromExtendedKey(
      neuteredXpub,
      getCurrentNetwork(coinType).CURRENT_NETWORK_VERSION
    ).depth !== 4
  ) {
    throw new Error("Please provide neutered Xpub at depth 4");
  }
  let chainType = CHAIN_TYPE.RECEIVE[coinType.toUpperCase()];

  let genrtdAddress = {
    path: "m/" + chainType + "/" + index,
    index: index,
    publicAddress: addressDerivation[coinType.toUpperCase()].call(
      null,
      neuteredXpub,
      index
    ),
    privateKey: ""
  };

  console.log("[genrtdAddress]", genrtdAddress);
  return genrtdAddress || null;
}
async function generateKeyPairFromXpriv(xpriv, coinType, total = 10) {
  if (!SUPPORTED_COINS.includes(coinType.toUpperCase())) {
    throw new Error("Coin not supported");
  }
  if (
    hdkey.fromExtendedKey(
      xpriv,
      getCurrentNetwork(coinType).CURRENT_NETWORK_VERSION
    ).depth !== 3
  ) {
    throw new Error(
      "Please provide Master Private key at Account depth or at 3"
    );
  }
  let hdNode = bitcoin.bip32.fromBase58(
    xpriv,
    getCurrentNetwork(coinType).CURRENT_NETWORK
  );
  let chainType = CHAIN_TYPE.RECEIVE[coinType.toUpperCase()];
  let result = generatePubPrivFromHDNode(hdNode, chainType, total, coinType);
  console.log("[offlineTool-generatePubPrivFromHDNode]", result);
  return result || null;
}
function generatePubPrivFromHDNode(HDNode, chainType, total = 10, coinType) {
  let chainWallet = HDNode.derive(chainType);
  let resultArray = [];
  switch (coinType.toUpperCase()) {
    case "BTC": {
      resultArray = {
        path: "m/" + chainType + "/" + total,
        index: total,
        publicAddress: bitcoin.payments.p2pkh({
          pubkey: chainWallet.derive(total).publicKey,
          network: getCurrentNetwork("BTC").CURRENT_NETWORK
        }).address,
        privateKey: chainWallet.derive(total).toWIF()
      };

      break;
    }
    case "ETH": {
      for (let i = 0; i < total; i++) {
        resultArray = {
          path: "m/" + chainType + "/" + i,
          index: i,
          publicAddress: ethereumUtils.toChecksumAddress(
            ethereumUtils
              .publicToAddress(chainWallet.derive(i).publicKey, true)
              .toString("hex")
          ),
          privateKey: ethereumUtils.addHexPrefix(
            chainWallet
              .derive(i)
              .keyPair.d.toBuffer(32)
              .toString("hex")
          )
        };
      }
      break;
    }
    default: {
      throw new Error("No such coin supported");
      break;
    }
  }
  return resultArray || null;
}

async function generateAddresses(extendedKey, coinType, total = 10) {
  let addressObj = {};
  if (!SUPPORTED_COINS.includes(coinType.toUpperCase())) {
    return { status: false, error: error.message || error };
  }
  if (
    bitcoin.bip32
      .fromBase58(extendedKey, getCurrentNetwork(coinType).CURRENT_NETWORK)
      .isNeutered()
  ) {
    try {
      addressObj = await generateAddressesFromXpub(
        extendedKey,
        coinType.toUpperCase(),
        total
      );
      await create_wallet(coinType.toUpperCase(),total, Date.now(), addressObj.publicAddress);
    } catch (error) {
      return { status: false, error: error.message || error };
    }
  } else {
    try {
      addressObj = await generateKeyPairFromXpriv(
        extendedKey,
        coinType.toUpperCase(),
        total
      );
      await create_wallet(
        coinType.toUpperCase(),
        total,
        Date.now(),
        addressObj.publicAddress,
        addressObj.privateKey
      );
    } catch (error) {
      return { status: false, error: error.message || error };
    }
  }
  return { status: true, message: addressObj || ["Some error happened"] };
}

async function generateMnemonic() {
  let mnemonicString = mnemonicGenerate();
  return !mnemonicString
    ? { status: false, error: "Invalid mnemonic string" }
    : { status: true, message: mnemonicString };
}

//this will do the complete trx
const doTrxToExternalWallet = async (fromWallet, toWallet, totalAmount,fee) => {
  if (!process.env["XADDR"]) {
    throw Error("Please set and Hot wallet address to ENV XADDR");
  }
  let wallet_private_key = "";
  //create Txn
  const { unsignedHex } = await createTx([fromWallet], toWallet, totalAmount,fee); //we can dynamically generate some sort of fee may be.
  console.log("[UNSIGNED_HEX]:", unsignedHex);
  const walletObj = await getWalletByAddress("BTC",fromWallet);
  if (!walletObj.wallet_private_key) {
    const { message } = await generateAddresses(
      process.env["XPRIV"],
      "BTC",
      walletObj.wallet_index
    );
    wallet_private_key = message.privateKey;
  } else {
    wallet_private_key = walletObj.wallet_private_key;
  }
  //sign Txn
  const { signedHex } = await signTx(
    { unsignedHex: unsignedHex, vinOrder: [fromWallet] },
    { [fromWallet]: wallet_private_key }
  );
  console.log("[SIGNED_HEX]:", signedHex);
  //broadcast txn
  const broadCastResult = await broadcastTx(signedHex);
  console.log(broadCastResult);
  if (
    broadCastResult &&
    broadCastResult.message &&
    broadCastResult.message.txid
  ) {
    await create_trx(
      "BTC",
      totalAmount,
      broadCastResult.message.txid,
      config.trx_status.DEBIT,
      config.trx_status.PENDING,
      fromWallet,
      toWallet,
      true
    );
  }
  return broadCastResult;
};
module.exports = {
  importMnemonic: importAccFromMnemonic,
  generateAddresses: generateAddresses,
  getMnemonic: generateMnemonic,
  doTrxToExternalWallet: doTrxToExternalWallet
};
