import { Document } from "mongoose";
import { IActivity } from "../interfaces/activity";

export interface IActivityModel extends IActivity, Document {
    //custom methods for your model would be defined here
}