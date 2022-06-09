import { Schema } from "mongoose";

export let channelSchema: Schema = new Schema({
    name: {
        type: String
    },
    description: {
        type: String
    },
    bannerImageLink: {
        type: String
    },
    imageLink: {
        type: String
    },
    subscribers: {
        type: String
    },
    tenantId: {
        type: String
    },
    userId: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUpdatedAt: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    }
});
