import { BaseService } from "./baseservice";
import { BasicResponse } from "../dto/output/basicresponse";
import { Status } from "../dto/enums/statusenum";
import { NextFunction, Request, Response } from "express";

export class StreamService extends BaseService {

    public async getStreamLink(req: Request, res: Response, next: NextFunction) {
        //
    }

}