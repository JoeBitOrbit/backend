import mongoose from 'mongoose';

const holidayModeSchema = new mongoose.Schema({
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
  collection: 'holiday_mode'
});

const HolidayMode = mongoose.model('HolidayMode', holidayModeSchema);

export default HolidayMode;
