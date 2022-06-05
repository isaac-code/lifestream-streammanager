import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { BasicResponse } from "../dto/output/basicresponse";
import { Status } from "../dto/enums/statusenum";

/**
 * Constructor
 *
 * @class BaseController
 */
export class BaseController {
  protected systemErrorMsg: object = {
    message: "Sorry your request could not be completed at the moment"
  };
  protected invalidCredentials: object = { message: "Invalid Credentials" };
  protected notAuthorized: object = {
    message: "You are not authorized to access this resource"
  };
  protected itemNotFound: object = { message: "Not found" };
  protected noResults: object = { message: "No results available" };
  protected start: number = 0;
  protected limit: number = 20;

  protected user_firstname = null;
  protected user_lastname = null;
  protected user_roles = null;
  protected user_email = null;
  protected user_tenantId = null;
  protected user_userType = null;
  protected user_id = null;

  protected initPagination(req: Request, post: boolean) {
    let obj: any = post ? req.body : req.query;

    if (obj.start && !isNaN(obj.start)) {
      this.start = +obj.start;
    }
    if (obj.limit && !isNaN(obj.limit)) {
      this.limit = +obj.limit;
    }
  }

  protected sendResponse(
    serviceResponse: BasicResponse,
    req: Request,
    res: Response,
    next: NextFunction
  ): any {
    var response = {
      status: serviceResponse.getStatusString(),
      data: serviceResponse.getData()
    };

    res.status(this.getHttpStatus(serviceResponse.getStatusString()));

    console.log("responding with", response);
    res.json(response);
    next();
  }

  private getHttpStatus(status: string): number {
    switch (status) {
      case "SUCCESS":
        return 200;
      case "CREATED":
        return 201;
      case "FAILED_VALIDATION":
        return 400;
      default:
        return 500;
    }
  }

  protected sendError(
    req: Request,
    res: Response,
    next: NextFunction,
    data?: Object
  ) {
    var dat = {
      status: 400,
      data: data
    };
    res.status(401);
    res.send(dat);
  }

  protected authorized(
    req: Request,
    res: Response,
    next: NextFunction
  ): boolean {
    let token =
      req.headers &&
        req.headers.authorization &&
        req.headers.authorization.split(" ")[0] === "Bearer"
        ? req.headers.authorization.split(" ")[1]
        : null;
    if (req && req.headers && req.headers.origin) {
      const gotorigin: any = req.headers.origin;
      let raworigin;
      let authorisedorigin = JSON.parse(`"${process.env.authorised_client}"`);
      if (gotorigin.includes("http://")) {
        raworigin = gotorigin.split("http://")[1];
      } else if (gotorigin.includes("https://")) {
        raworigin = gotorigin.split("https://")[1];
      }

      if (token === null) {
        if (authorisedorigin && raworigin) {
          authorisedorigin = authorisedorigin.split(",");
          if (authorisedorigin.indexOf(raworigin) != -1) {
            return true;
          }
        }
        console.log("cant find header");
        return false;
      }
    } else if (token === null) {
      return false;
    }

    try {
      var publicKey = JSON.parse(`"${process.env.JWT_PUBLIC_KEY}"`); //https://github.com/motdotla/dotenv/issues/218

      var user = verify(token, publicKey, {
        algorithms: ["RS256"],
        issuer: process.env.JWT_ISSUER
      });
      this.setUserVariables(user);

      req.app.locals.userobj = user;
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  protected hasUploadError(uploadError: BasicResponse): any {
    return uploadError != null;
  }

  protected getUploadError(multi: boolean, req: any, err: any): any {
    if (err && err.code && err.code === "LIMIT_FILE_SIZE") {
      return new BasicResponse(Status.FAILED_VALIDATION, {
        field: "file",
        errorMessage: "file must not exceed 1MB"
      });
    }

    var uploadedFiles = multi ? req.files : req.file;

    if (
      (err && err.code && err.code === "LIMIT_UNEXPECTED_FILE") ||
      !uploadedFiles
    ) {
      return new BasicResponse(Status.FAILED_VALIDATION, {
        field: "file",
        errorMessage: "no file uploaded"
      });
    }

    return null;
  }

  protected setUserVariables(user) {
    this.user_firstname = user.firstname;
    this.user_lastname = user.lastname;
    this.user_email = user.email;
    this.user_roles = user.roles;
    this.user_tenantId = user.organisationId;
    this.user_id = user.userId;
    this.user_userType = user.userType;
  }
}
