const uuid = require('node-uuid');
const offlineTool = require('../utils/offLineOperations');
const {get_balance,addressIsLocal,create_trx,get_trx} = require('../utils/mongo_uils')
const config = require('../config')

//balance?address=sasas
const getBalance = async(req,res)=>{
    const bal = await get_balance("BTC",req.query.address);
    return res.json({
        success:true,
        balance:bal||0
    })
}

const createTrx = async(req,res)=>{
    const {fromAddress,toAddress,amount,fee}= req.body
    try{
const isLocal = await addressIsLocal("BTC",toAddress); //check if destincation is local or not.
    if(isLocal){
       const tx_hash=uuid.v4()
        await create_trx("BTC",amount,tx_hash,config.trx_status.DEBIT,config.trx_status.CONFIRMED,fromAddress,toAddress,false);
        return res.json({success:true,tx_hash:tx_hash})
    }else{
       const tx =await offlineTool.doTrxToExternalWallet(fromAddress,toAddress,amount,fee);
       return res.json({success:true,tx:tx})
    }}
    catch(ex){
        return res.json({
            success:false,
            error:ex
        })
    }
}

//?address=
const getTrxByAddress = async(req,res)=>{
    const {address} = req.query
    const isLocal = await addressIsLocal("BTC",address); 
    if(!isLocal){
        return res.json({
            success:false,
            error:"Address not found in exchange!"
        })
    }
    const trx= await get_trx("BTC",address)
    return res.json({
        success:true,
        tx:trx
    });
}


module.exports={
    getBalance,
    createTrx,
    getTrxByAddress
}