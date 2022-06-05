import { Schema, model } from "mongoose";

export let activitySchema: Schema = new Schema({
  secret: {
    actionType: String,
    previousEntity: Object,
    newEntity: Object
  },
  schemaName: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  entityId: {
    type: String,
    default: "list"
  },
  remotelyStored: {
    type: Boolean,
    default: false
  },
  channel: {
    type: String,
    default: "unknown"
  },
  tenantId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
