const BigNumber = require("bignumber.js");
const config = require("../config");
const Wallets = require("../models/wallets");
const Transactions = require("../models/txn");

const addressIsLocal = async(address)=>{
    const count = await Wallets.countDocuments({wallet_address:address}).exec();
    return count ? true :false;
}
//gieve you address like this  [....,.....,....]
const getLocalAddressArr =async()=>{
    const walletDocs = await Wallets.find().select('wallet_address').exec();
    return walletDocs.map(i=>i.wallet_address)
}

const create_wallet = async (index, name, address, private_key = null) => {
  const found = await Wallets.findOne({
    wallet_index: index,
    wallet_address: address
  }).exec();
  if (found && !found.wallet_private_key && private_key) {
    return Wallets.update(
      {
        wallet_index: index,
        wallet_address: address
      },
      { $set: { wallet_private_key: private_key } }
    ).exec();
  } else if (!found) {
    const walletObj = new Wallets({
      wallet_index: index,
      wallet_name: name,
      wallet_address: address,
      wallet_private_key: private_key
    });
    return await walletObj.save();
  } else {
    return true;
  }
};

const get_all_wallets = () => {
  return Wallets.find({}).exec();
};
const get_balance = async address => {
  const wallet_obj = await Wallets.find(
    { wallet_address: address },
    "balance_in_satoshi"
  ).exec();
  if (wallet_obj && wallet_obj.balance_in_satoshi) {
    return new BigNumber(wallet_obj.balance_in_satoshi).toString();
  }
};

//---------------------------Transactions------------------//
const create_trx = (
  amount_in_satoshi,
  tx_hash,
  trx_type,
  trx_status,
  from_wallet,
  to_wallet,
  trx_external
) => {
  let trxdoc = [
    {
      originator_address: from_wallet,
      beneficiary_address: to_wallet,
      status: trx_status,
      trx_type:
        trx_type == config.trx_status.DEBIT
          ? config.trx_status.DEBIT
          : config.trx_status.CREDIT, //either debit/credit
      tx_hash: tx_hash,
      trx_external: trx_external ? true : false,
      amount_in_satoshi: amount_in_satoshi //bignumber
    }
  ];
  if (!trx_external && to_wallet) {
    trxdoc.push({
      originator_address: from_wallet,
      beneficiary_address: to_wallet,
      status: trx_status,
      trx_type:
        trx_type == config.trx_status.DEBIT
          ? config.trx_status.CREDIT
          : config.trx_status.DEBIT, //either debit/credit
      tx_hash: tx_hash,
      trx_external: trx_external ? true : false,
      amount_in_satoshi: amount_in_satoshi //bignumber
    });
  }
  const txnObj = new Transactions(trxdoc);
  Wallets.findOne({ wallet_address: from_wallet }).then(d => {
    d.balance_in_satoshi = new BigNumber(d.balance_in_satoshi).minus(
      amount_in_satoshi
    );
    d.update();
  });

  //when transaction is internal
  if (!trx_external && to_wallet) {
    Wallets.findOne({ wallet_address: to_wallet }).then(d => {
      d.balance_in_satoshi = new BigNumber(d.balance_in_satoshi).plus(
        amount_in_satoshi
      );
      d.update();
    });
  }
  return txnObj.save();
};
//will be called from some external job
//its credit only, when someone from outside sends some into internal address
const incoming_external_txn = (
  amount_in_satoshi,
  tx_hash,
  trx_status,
  from_wallet,
  to_wallet
) => {
  let trxdoc = {
    originator_address: from_wallet,
    beneficiary_address: to_wallet,
    status: trx_status,
    trx_type: config.trx_status.CREDIT,
    tx_hash: tx_hash,
    trx_external: true,
    amount_in_satoshi: amount_in_satoshi //bignumber
  };
  Wallets.findOne({ wallet_address: to_wallet }).then(d => {
    d.balance_in_satoshi = new BigNumber(d.balance_in_satoshi).plus(
      amount_in_satoshi
    );
    d.update();
  });
  const txnObj = new Transactions(trxdoc);
  return txnObj.save();
};

const update_txn_status = (tx_hash, trx_status) => {
  return Transactions.updateMany(
    { tx_hash: tx_hash },
    { $set: { status: trx_status } }
  );
};

const get_trx = async address => {
  //for an address
  // originator to benefeciary address is always a debit
  // so check in originator_address field for debit and beneficiary_address for credit entry
  const debit_trxs = await Transactions.find({
    originator_address: address,
    trx_type: config.trx_status.DEBIT
  })
    .sort({ createdAt: 1 })
    .exec();
  const credit_trxs = await Transactions.find({
    beneficiary_address: address,
    trx_type: config.trx_status.CREDIT
  })
    .sort({ createdAt: 1 })
    .exec();
  return {
    debit: debit_trxs,
    credit: credit_trxs
  };
};

module.exports = {
    addressIsLocal,
    getLocalAddressArr,
  create_wallet,
  get_balance,
  get_all_wallets,
  create_trx,
  incoming_external_txn,
  update_txn_status,
  get_trx
};
