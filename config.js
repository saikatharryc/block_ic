module.exports = {
    net: 'TESTNET',
    current: 'test', //live
    insightProvider: {
      test: 'https://api.bitcore.io/api/BTC/testnet',
      live: 'https://api.bitcore.io/api/BTC/mainnet'
    },
    network: {
      BTC: {
        current: 'test',
        test: 'testnet',
        live: 'bitcoin',
        insightProvider: {
          test: 'https://api.bitcore.io/api/BTC/testnet',
          live: 'https://api.bitcore.io/api/BTC/mainnet'
        }
      }
    }
  };
  