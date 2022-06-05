import { NextFunction, Request, Response, Router } from "express";
import { StreamService } from "../services/streamservice";
import { BaseController } from "./basecontroller";

export class StreamController extends BaseController {

    loadRoutes(prefix, router) {
        this.getStreamLink(prefix, router);
    }

    public getStreamLink(prefix: String, router: Router): any {
        router.get(
            prefix + "/get-link",
            (req: Request, res: Response, next: NextFunction) => {
                new StreamService().getStreamLink(req, res, next);
            }
        );
    }

}