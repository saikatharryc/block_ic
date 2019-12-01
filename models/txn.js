const mongoose = require("mongoose");

var TransactionSchema = mongoose.Schema(
  {
    originator_address: String,
    beneficiary_address: String,
    status: {
      type:Number,
      enum:[10,20,30], //10: Pending, 20: Confirmed, 30: Cancelled/failed
      default:10,
      required:true
    },
    trx_type:{
        type: Number,
        enum: [40,50], //40: Debit, 50: Credit
        default:40
    },
    tx_hash:{
        type:String,
        required:true
    },
    trx_external:{
        type:Boolean,
        default:false
    },
    amount_in_satoshi:{
      type:String,
      required:true
    }
  },
  { timestamps: true }
);
const Transactions =mongoose.model("Transactions", TransactionSchema);

module.exports = Transactions;
