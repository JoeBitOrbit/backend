import mongoose from 'mongoose';

const christmasModeSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false
  },
  discount: {
    type: Number,
    default: 25
  },
  snowflakesEnabled: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: String,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'christmas_mode'
});

const ChristmasMode = mongoose.model('ChristmasMode', christmasModeSchema);

export default ChristmasMode;
