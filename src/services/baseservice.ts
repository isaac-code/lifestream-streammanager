import { Validator } from "validator.ts/Validator";
import chalk = require("chalk");
import { BasicResponse } from "../dto/output/basicresponse";
import crypto = require("crypto");
import { NextFunction, Request, Response } from "express";

export class BaseService {
    protected errors;

    protected hasErrors(input: any): boolean {
        let errors = new Validator().validate(input);
        this.errors = errors;
        return !(errors === undefined || errors.length == 0);
    }

    protected sha256(data) {
        return crypto
            .createHash("sha256")
            .update(data, "utf8")
            .digest("base64");
    }

    protected isValidDate(dateString) {
        // Parse the date parts to integers
        var parts = dateString.split("-");
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        var day = parseInt(parts[2], 10);

        // Check the ranges of month and year
        if (year < 2016 || year > 3000 || month == 0 || month > 12) return false;

        var monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        // Adjust for leap years
        if (year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
            monthLength[1] = 29;

        // Check the range of the day
        return day > 0 && day <= monthLength[month - 1];
    }

    protected sendError(
        req: Request,
        res: Response,
        next: NextFunction,
        data?: Object
    ) {
        var dat = {
            status: 401,
            data: data
        };
        res.status(401);
        res.send(dat);
    }

    public sendResponse(
        serviceResponse: BasicResponse,
        res: Response,
        req?: Response
    ): any {
        var response = {
            status: serviceResponse.getStatusString(),
            message: serviceResponse.getMessage(),
            data: serviceResponse.getData(),
            recordCount: serviceResponse.getRecordCount()
        };

        res.status(this.getHttpStatus(serviceResponse.getStatusString()));

        console.log("responding with", response);
        res.json(response);
    }

    protected sendException(
        ex,
        serviceResponse: BasicResponse,
        req: Request,
        res: Response,
        next: NextFunction
    ): any {
        console.log(chalk.blue.bgRed.bold(ex));
        this.sendResponse(serviceResponse, res);
    }

    private getHttpStatus(status: string): number {
        switch (status) {
            case "SUCCESS":
                return 200;
            case "CREATED":
                return 201;
            case "FAILED_VALIDATION":
                return 400;
            case "UNAUTHORIZED":
                return 401;
            case "NOT_FOUND":
                return 404;
            case "CONFLICT":
                return 409;
            case "UNPROCESSABLE_ENTRY":
                return 422;
            case "SUCCESS_NO_CONTENT":
                return 204;
            default:
                return 500;
        }
    }

    protected logInfo(info: string) {
        console.log(chalk.blue.bgGreen.bold(info));
    }

    protected logError(error: string) {
        console.log(chalk.blue.bgRed.bold(error));
    }

    protected getDuplicateError(type: string, name: string): any {
        return {
            property: type,
            constraints: { unique: "must be unique" },
            value: name
        };
    }

    protected getInvalidDataError(type: string, name: string): any {
        return {
            property: type,
            constraints: { "valid data": "must be valid" },
            value: name
        };
    }

    protected getRequiredError(type: string, name: string): any {
        return {
            property: type,
            constraints: { required: "is required" },
            value: name
        };
    }

    protected getRequestUnprocessableError(item: any): any {
        return {
            property: "item",
            constraints: {
                error: "Oops sorry we currently do not have that item in store"
            },
            value: item
        };
    }

}
