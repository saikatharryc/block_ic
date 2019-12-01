const rp = require('request-promise')
const bignumber = require('bignumber.js')
const {getLocalAddressArr,incoming_external_txn} = require('./utils/mongo_uils')
const {createTx,signTx,broadcastTx} =require('./utils/btcHelper')
const {generateAddresses}= require('./utils/offLineOperations')
const config =require('./config')

const getCurrentTip = async()=>{
    const response = await rp.get(config.insightProvider[config.current]+'/block/tip',{
        json:true
    })
    return response;
}


const incoming_trx_throttl =async(address)=>{
    const response = await rp.get(config.insightProvider[config.current]+'/address/'+address+'/txs',{json:true});
    const {height}= await getCurrentTip()
    for(let i of response){
        await incoming_external_txn(i.value,
        i.mintTxid,
        i.mintHeight == -1  ? config.trx_status.PENDING: ((height-i.mintHeight) >= 6 ? config.trx_status.CONFIRMED:config.trx_status.PENDING),
        null,
        address)
    }

}

const get_wallet_bal = async(address)=>{
const response=await rp.get(config.insightProvider[config.current]+'/address/' + address+'/balance',{json:true});
if(response.confirmed){
    await incoming_trx_throttl(address)
    return response.confirmed;
}
return false;
}

const doTrxToHotWallet = async(fromWallets,totalAmount,privKeysArr)=>{
    if(!process.env['XADDR']){
        throw Error('Please set and Hot wallet address to ENV XADDR')
    }
    //create Txn
    const {unsignedHex}= await createTx(fromWallets,process.env['XADDR'],totalAmount) //we can dynamically generate some sort of fee may be.
    console.log('[UNSIGNED_HEX]:',unsignedHex)
    //sign Txn
    const {signedHex} = await signTx(unsignedHex,privKeysArr);
    console.log('[SIGNED_HEX]:',signedHex)
    //broadcast txn
    const broadCastResult = await broadcastTx(signedHex);
    console.log(broadCastResult);
    return broadCastResult;
}

const roll_over_wallets =async()=>{
    const totalAmount = new bignumber()
    const fromWallets = []
    const privKeys = []
    const all_addresses= await getLocalAddressArr();
    for(let i of all_addresses){
        const retrivedBal = await get_wallet_bal(i);
        if(retrivedBal){
            totalAmount.plus(retrivedBal)
            fromWallets.push(i.wallet_address)
            if(i.wallet_private_key){
                privKeys.push(i.wallet_private_key)
            }else{
                const {message}=await generateAddresses(process.env['XPRIV'],'BTC',i.wallet_index)
                privKeys.push(message.privateKey)
            }
        }
    }
    return await doTrxToHotWallet(fromWallets,totalAmount,privKeys)
}


module.exports={roll_over_wallets}