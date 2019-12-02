const rp = require('request-promise');
const config =require('./config')
const START_BEHIND=20; //if no blocks mined, start from 20 blocks behind

const {get_all_unconfirmed_external_txn,create_remark_block,get_last_processed_block,update_txn_status} = require('./utils/mongo_uils')

const getCurrentTip = async()=>{
    const response = await rp.get(config.insightProvider[config.current]+'/block/tip',{
        json:true
    })
    return response;
}

const explore_block_by_no= async(block_height)=>{
    let trx_status = config.trx_status.PENDING
    const response = await rp.get(config.insightProvider[config.current]+'/tx?blockHeight='+block_height,{
        json:true
    });
    const {height}= await getCurrentTip()
    if(height-block_height >=6){
        trx_status=config.trx_status.CONFIRMED
    }
    
    const tx_hash_arr = response.map(i=>i.txid)
    const all_tx = await get_all_unconfirmed_external_txn("BTC");
    for(let i of all_tx){
        if(tx_hash_arr.indexOf(i.tx_hash) > -1 ){
            await update_txn_status("BTC",i.tx_hash,trx_status)
        }
    }
    return await create_remark_block("BTC",response[0].blockHash,block_height);

}
const block_explorer_bulk =async(from_block,to_block)=>{
    const promiseArr =[]
    for(i=from_block;i<=to_block;i++){
        promiseArr.push(explore_block_by_no(i));
    }
    return await Promise.all(promiseArr);
}

const start_exploring = async()=>{
    try{
   const {height}= await getCurrentTip()
    const last_block_doc = await get_last_processed_block("BTC")
    if(last_block_doc && last_block_doc.length){
        //start from the last mined block to current tip -1
        b= await block_explorer_bulk(last_block_doc[0].last_explored_height+1,height-1);
        return b
    }else{
        console.log("Hii")
        //start from behind 20 i.e START_BEHIND to current tip -1
        
        a= await block_explorer_bulk(height-START_BEHIND,height-1);
        return a;
    }
    }catch(Ex){
        console.log(Ex)
    }
    
}
module.exports={start_exploring}