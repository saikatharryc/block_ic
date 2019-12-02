const BigNumber = require("bignumber.js");
const config = require("../config");
const Wallets = require("../models/wallets");
const Transactions = require("../models/txn");
const Block = require('../models/block')
const addressIsLocal = async(coinType,address)=>{
    const count = await Wallets.countDocuments({coinType:coinType,wallet_address:address}).exec();
    return count ? true :false;
}
//gieve you address like this  [....,.....,....]
const getLocalAddressArr =async()=>{
    const walletDocs = await Wallets.find({wallet_index:{$ne:config.DEPTH_INDEX}}).select('coinType wallet_address wallet_index wallet_private_key').exec();
    return walletDocs
}

const create_wallet = async (coinType,index, name, address, private_key = null) => {
  const found = await Wallets.findOne({
    coinType:coinType,
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
      coinType:coinType,
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

const get_all_wallets = (coinType) => {
  return Wallets.find({coinType:coinType}).exec();
};
const get_balance = async (coinType,address) => {
  const wallet_obj = await Wallets.findOne(
    { wallet_address: address ,coinType:coinType},
    "balance_in_satoshi"
  ).exec();
  if (wallet_obj && wallet_obj.balance_in_satoshi) {
    return new BigNumber(wallet_obj.balance_in_satoshi).toString();
  }
};

const getWalletByAddress =(coinType,address) =>{
  return Wallets.findOne(
    { wallet_address: address,coinType:coinType }
  ).lean().exec();
} 


//---------------------------Transactions------------------//
const create_trx = async(
  coinType,
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
      coinType:coinType,
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
    const balance = await get_balance(coinType,from_wallet)
    if(Number(balance) < amount_in_satoshi){
      throw "Low balance!"
    }
    trxdoc.push({
      coinType:coinType,
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
  Wallets.findOne({ wallet_address: from_wallet,coinType:coinType }).then(d => {
    d.balance_in_satoshi = new BigNumber(d.balance_in_satoshi).minus(
      amount_in_satoshi
    );
    d.save();
  });

  //when transaction is internal
  if (!trx_external && to_wallet) {
    Wallets.findOne({ wallet_address: to_wallet,coinType:coinType }).then(d => {
      d.balance_in_satoshi = new BigNumber(d.balance_in_satoshi).plus(
        amount_in_satoshi
      );
      d.save();
    });
  }
  return await Transactions.insertMany(trxdoc);
};
//will be called from some external job
//its credit only, when someone from outside sends some into internal address
const incoming_external_txn = (
  coinType,
  amount_in_satoshi,
  tx_hash,
  trx_status,
  from_wallet,
  to_wallet
) => {
  Transactions.countDocuments({
    tx_hash:tx_hash
  }).then(d=>{
    console.log(tx_hash+"  Transaction already there.")
    if(d){
      return true;
    }
  });
  let trxdoc = {
    coinType:coinType,
    originator_address: from_wallet,
    beneficiary_address: to_wallet,
    status: trx_status,
    trx_type: config.trx_status.CREDIT,
    tx_hash: tx_hash,
    trx_external: true,
    amount_in_satoshi: amount_in_satoshi //bignumber
  };
  Wallets.findOne({ wallet_address: to_wallet,coinType:coinType }).then(d => {
    d.balance_in_satoshi = new BigNumber(d.balance_in_satoshi).plus(
      amount_in_satoshi
    );
    d.update();
  });
  const txnObj = new Transactions(trxdoc);
  return txnObj.save();
};

const update_txn_status = (coinType,tx_hash, trx_status) => {
  return Transactions.updateMany(
    { tx_hash: tx_hash ,coinType:coinType},
    { $set: { status: trx_status } }
  );
};

const get_trx = async (coinType,address) => {
  //for an address
  // originator to benefeciary address is always a debit
  // so check in originator_address field for debit and beneficiary_address for credit entry
  const debit_trxs = await Transactions.find({
    coinType:coinType,
    originator_address: address,
    trx_type: config.trx_status.DEBIT
  })
    .sort({ createdAt: -1 })
    .exec();
  const credit_trxs = await Transactions.find({
    beneficiary_address: address,
    trx_type: config.trx_status.CREDIT
  })
    .sort({ createdAt: -1 })
    .exec();
  return {
    debit: debit_trxs,
    credit: credit_trxs
  };
};


const get_all_unconfirmed_external_txn=(coinType)=>{
 return Transactions.find({coinType:coinType,trx_external:true,status:config.trx_status.PENDING}).exec()
}
//------------Block Related---------//

const get_last_processed_block = async(coinType)=>{
  try{
  a= await Block.find({coinType:coinType}).exec();
  return a;
  }catch(ex){
    console.log(ex)
  }
}
const create_remark_block =async(coinType,block_hash,block_number)=>{
 const existingDoc=  await Block.find({coinType:coinType}).exec();
 if(!existingDoc || !existingDoc.length){
  //create
  const blockObj = new Block({
    coinType:coinType,
    last_explored_height:block_number,
    last_explored_block_hash:block_hash
  })
  return await blockObj.save()
 }
 if(existingDoc && existingDoc.length){
   //update
   return await Block.update({
     _id:existingDoc[0]._id
   },{$set:{
    last_explored_height:block_number,
    last_explored_block_hash:block_hash
   }})
 }
 return false;
}



module.exports = {
    addressIsLocal,
    getLocalAddressArr,
  create_wallet,
  get_balance,
  get_all_wallets,
  create_trx,
  incoming_external_txn,
  update_txn_status,
  get_trx,
  get_all_unconfirmed_external_txn,
  create_remark_block,
  get_last_processed_block,
  getWalletByAddress
};


