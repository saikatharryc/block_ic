# block_ic
> To deploy, look at the `MONGO_URL` in `config.js` and change 
Suggestion: Use Mlab to generate some sandbox instance and use the url in here.
**RUN:**
```shell
> npm install
> npm start
```

*Its now listning in pot 3000*
In Postman, set the `BASE_URL` to `localhost:3000`

* Start by `{{BASE_URL}}/getmnemonic` , this will ive you mnemonic to create wallet.

* Go to `{{BASE_URL}}/importaccount` , pass the mnemonic and coin ID (e.g BTC), in response it will give you root wallet details.

* You can also derrive addresses from other indexes by using `{{BASE_URL}}/generateAddress`
 just pass the `addressDerivationXpub` (from previous api response) in the place of `extendedKey` to create wallet, to get the wallets private key as well, pass `accountXpriv` in the place of `extendedKey`

 * You can now check balance of an address, `{{BASE_URL}}/raw/balance?address=<ADDRESS>&coin=<COIN>` 

 * You can also do transaction, 
  create a unsigned txn `{{BASE_URL}}/sendtransaction/raw/createTxn` for BTC you can pass multiple addresses  (from)
   for consolidation.
 * Once you got the response with `unsignedHex` & `vinOrder`, you can use it to sign the txn: `{{BASE_URL}}/sendtransaction/raw/signTxn`, along with the private keys of thse wallets from whcih you are sending.

  * Once Txn is signed, you can now Broadcast it to the network,
  `{{BASE_URL}}/raw/broadcastTransaction` in this you need to pass the signed Txn hash.


## [WIP] For exchange type

Look at the apis in Exchange Internal Folder in postman.
Here you can manage/transfer/get coins internally, as we are storing the balances of users in a hot wallet. and hence internal txn will not have fees. 

In other hand When transferring received coins in user wallet to be transferred from the wallet to the hot wallet may have some small fees, for eth based coins, we can have different startegy, but for BTC we can consolidate multiple address and send at once, hence we can save lots of network fees.



_______

*  `cron.js` takes care of moving the Balance of child wallets (as of not BTC) to Ht wallet. & along with that it also checks for incoming transactions.

*  To Run cron `node cron.js` [with current testnet insight it will fails, as rate limiter present in testnet, we need to use our own deployed bitcore testnet instead to make this work.]
*  To run the main app: `node index.js`
