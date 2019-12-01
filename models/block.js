const mongoose = require("mongoose");

var BlockSchema = mongoose.Schema(
  {
    last_explored_height: {
      type: Number
    },
    last_explored_block_hash: {
      type: String //block hash
    }
  },
  { timestamps: true }
);
const Block = mongoose.model("Block", BlockSchema);

module.exports = Block;
