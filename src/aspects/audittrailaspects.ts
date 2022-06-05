import { afterMethod, beforeMethod, onException } from "kaop-ts";
import { IActivityModel } from "../models/activity";
import { BasicResponse } from "../dto/output/basicresponse";
import { Status } from "../dto/enums/statusenum";
import { IsNumberString } from "class-validator";
import crypto = require("crypto");
import chalk = require("chalk");
const axios = require("axios");

export const handleException = (): any =>
  onException(meta => {
    let response = meta.args[1];
    sendResponse(new BasicResponse(Status.ERROR), response);
  });

function isMissing(param) {
  return !param;
}

function isNotANumber(param) {
  return !(IsNumberString(param) || Number.isInteger(param));
}

async function filterQuery(meta) {
  let queryObj = {};
  let request = await meta.args[0];
  let metaResult = await meta.result;
  if (metaResult && metaResult.tenant == true) {
    let tenantId = request.app.locals.userobj.organisationId;
    queryObj["tenantId"] = { $in: ["default", tenantId] };
  }
  queryObj["status"] = { $ne: "DELETED" };

  if (metaResult && metaResult.paramFilter) {
    await Object.keys(metaResult.paramFilter).map(key => {
      queryObj[key] = metaResult.paramFilter[key];
    });
  }

  if (request.query) {
    await Object.keys(request.query).map(key => {
      if (
        key != "offset" &&
        key != "limit" &&
        key != "sort" &&
        key != "distinct"
      ) {
        if (request.query[key] == "null") {
          queryObj[key] = null;
        } else if (request.query[key] == "true") {
          queryObj[key] = true;
        } else if (request.query[key] == "false") {
          queryObj[key] = false;
        } else if (key.toLowerCase().includes("sha256")) {
          let sha256Key = key.replace(/sha256/gi, "");
          queryObj[sha256Key] = sha256(request.query[key]);
        } else {
          !queryObj[key] ? (queryObj[key] = request.query[key]) : "";
        }
      }
    });
  }

  return queryObj;
}

async function filterParams(meta) {
  let paramObj = {};
  let request = await meta.args[0];
  await Object.keys(request.params).map(key => {
    if (request.params[key] == "null") {
      paramObj[key] = null;
    } else {
      paramObj[key] = request.params[key];
    }
  });
  return paramObj;
}

async function prepMetaData(meta) {
  let data;
  let request = meta.args[0];
  let response = meta.args[1];
  let next = meta.args[2];

  let offset = parseInt(request.query.offset);
  let limit = parseInt(request.query.limit);
  let queriedSort = request.query.sort;
  let distinct = request.query.distinct;

  let filter = await filterQuery(meta);

  if (isMissing(offset) || isNotANumber(offset)) {
    offset = 0;
  }

  if (isMissing(limit) || isNotANumber(limit)) {
    limit = 50;
  }

  let skip = offset;
  let count = 0;

  let metaResult = await meta.result;

  let populateField =
    metaResult && metaResult.populateField ? metaResult.populateField : "";

  let sort = queriedSort
    ? queriedSort
    : metaResult && metaResult.sort
      ? metaResult.sort
      : "";

  data = {
    request: request,
    response: response,
    next: next,
    offset: offset,
    limit: limit,
    skip: skip,
    count: count,
    sort: sort,
    filter: filter,
    distinct: distinct,
    populateField: populateField
  };

  return data;
}

export const listOne = (schemaName: string): any =>
  afterMethod(async meta => {
    const data = await prepMetaData(meta);

    let params: any = await filterParams(meta);
    data.filter["_id"] = params.id;

    schemaName = schemaName.toLowerCase();

    let metaResult = await meta.result;

    data.request.app.locals[schemaName]
      .findOne(data.filter)
      .populate(data.populateField)
      .then(async result => {
        if (!result) {
          sendResponse(new BasicResponse(Status.NOT_FOUND), data.response);
          return data.next();
        } else {
          saveActivity(
            schemaName,
            null,
            result,
            "listone",
            data.request
          );

          if (metaResult.tenant == true) {
            await validateDataTenant(data, result);
          }
          sendResponse(
            new BasicResponse(Status.SUCCESS, result),
            data.response
          );
          return data.next();
        }
      })
      .catch(err => {
        sendResponse(new BasicResponse(Status.ERROR, err), data.response);
        return data.next();
      });
  });

export const list = (schemaName: string): any =>
  afterMethod(async meta => {
    const data = await prepMetaData(meta);

    schemaName = schemaName.toLowerCase();

    let metaResult = await meta.result;

    if (schemaName.toLowerCase() == "inventoryitemtag") {
      delete data.filter["userId"];
    }
    await data.request.app.locals[schemaName]
      .find(data.filter)
      .countDocuments()
      .then(result => {
        data.count = result;
      });

    data.request.app.locals[schemaName]
      .find(data.filter)
      .sort(data.sort)
      .skip(parseInt(data.skip))
      .limit(parseInt(data.limit))
      .populate(data.populateField)
      .then(async result => {

        if (!result) {
          sendResponse(new BasicResponse(Status.NOT_FOUND), data.response);
          return data.next();
        } else {
          saveActivity(schemaName, null, "", "list", data.request);

          if (metaResult.tenant == true) {
            await validateDataTenant(data, result);
          }
          sendResponse(
            new BasicResponse(Status.SUCCESS, result, data.count),
            data.response
          );
          return data.next();
        }
      })
      .catch(err => {
        sendResponse(new BasicResponse(Status.ERROR, err), data.response);
        return data.next();
      });
  });

export const suspend = (schemaName: string): any =>
  afterMethod(async meta => {
    const data = await prepMetaData(meta);

    let params: any = await filterParams(meta);
    data.filter["_id"] = params.id;

    schemaName = schemaName.toLowerCase();

    let existingData = null;

    let previousData;

    await data.request.app.locals[schemaName]
      .findOne(data.filter)
      .populate(data.populateField)
      .then(async result => {
        if (!result) {
          sendResponse(new BasicResponse(Status.NOT_FOUND), data.response);
          return data.next();
        } else {
          previousData = result;
          await validateDataTenant(data, result);

          existingData = result;
          existingData.isActive = false;
          await existingData.save();

          saveActivity(
            schemaName,
            previousData,
            existingData,
            "suspend",
            data.request
          );
          sendResponse(
            new BasicResponse(Status.SUCCESS, existingData),
            data.response
          );
        }
      })
      .catch(err => {
        sendResponse(new BasicResponse(Status.ERROR, err), data.response);
        return data.next();
      });
  });

export const unsuspend = (schemaName: string): any =>
  afterMethod(async meta => {
    const data = await prepMetaData(meta);

    let params: any = await filterParams(meta);
    data.filter["_id"] = params.id;

    schemaName = schemaName.toLowerCase();

    let existingData = null;

    let previousData;

    await data.request.app.locals[schemaName]
      .findOne(data.filter)
      .populate(data.populateField)
      .then(async result => {
        if (!result) {
          sendResponse(new BasicResponse(Status.NOT_FOUND), data.response);
          return data.next();
        } else {
          previousData = result;
          await validateDataTenant(data, result);

          existingData = result;
          existingData.isActive = true;
          await existingData.save();

          saveActivity(
            schemaName,
            previousData,
            existingData,
            "unsuspend",
            data.request
          );

          sendResponse(
            new BasicResponse(Status.SUCCESS, existingData),
            data.response
          );
        }
      })
      .catch(err => {
        sendResponse(new BasicResponse(Status.ERROR, err), data.response);
        return data.next();
      });
  });

export const updateStatus = (schemaName: string): any =>
  afterMethod(async meta => {
    const data = await prepMetaData(meta);

    let params: any = await filterParams(meta);
    data.filter["_id"] = params.id;

    schemaName = schemaName.toLowerCase();

    let existingData = null;

    let previousData;

    await data.request.app.locals[schemaName]
      .findOne(data.filter)
      .populate(data.populateField)
      .then(async result => {
        if (!result) {
          sendResponse(new BasicResponse(Status.NOT_FOUND), data.response);
          return data.next();
        } else {
          previousData = result;
          await validateDataTenant(data, result);

          existingData = result;
          existingData.status = params.status;
          existingData.statusUpdatedBy =
            data.request.app.locals.userobj &&
            data.request.app.locals.userobj.userId;
          await existingData.save();

          saveActivity(
            schemaName,
            previousData,
            existingData,
            "update status to " + params.status,
            data.request
          );
          sendResponse(
            new BasicResponse(Status.SUCCESS, existingData),
            data.response
          );
        }
      })
      .catch(err => {
        sendResponse(new BasicResponse(Status.ERROR, err), data.response);
        return data.next();
      });
  });

export const feature = (schemaName: string): any =>
  afterMethod(async meta => {
    const data = await prepMetaData(meta);

    let params: any = await filterParams(meta);
    data.filter["_id"] = params.id;

    schemaName = schemaName.toLowerCase();

    let existingData = null;

    let previousData;

    await data.request.app.locals[schemaName]
      .findOne(data.filter)
      .populate(data.populateField)
      .then(async result => {
        if (!result) {
          sendResponse(new BasicResponse(Status.NOT_FOUND), data.response);
          return data.next();
        } else {
          previousData = result;
          await validateDataTenant(data, result);

          existingData = result;
          existingData.featured = true;
          existingData.featuredAt = Date.now();
          await existingData.save();

          saveActivity(
            schemaName,
            previousData,
            existingData,
            "feature",
            data.request
          );

          sendResponse(
            new BasicResponse(Status.SUCCESS, existingData),
            data.response
          );
        }
      })
      .catch(err => {
        sendResponse(new BasicResponse(Status.ERROR, err), data.response);
        return data.next();
      });
  });

export const unfeature = (schemaName: string): any =>
  afterMethod(async meta => {
    const data = await prepMetaData(meta);

    let params: any = await filterParams(meta);
    data.filter["_id"] = params.id;

    schemaName = schemaName.toLowerCase();

    let existingData = null;

    let previousData;

    await data.request.app.locals[schemaName]
      .findOne(data.filter)
      .populate(data.populateField)
      .then(async result => {
        if (!result) {
          sendResponse(new BasicResponse(Status.NOT_FOUND), data.response);
          return data.next();
        } else {
          previousData = result;
          await validateDataTenant(data, result);

          existingData = result;
          existingData.featured = false;
          await existingData.save();

          saveActivity(
            schemaName,
            previousData,
            existingData,
            "unfeature",
            data.request
          );
          sendResponse(
            new BasicResponse(Status.SUCCESS, existingData),
            data.response
          );
        }
      })
      .catch(err => {
        sendResponse(new BasicResponse(Status.ERROR, err), data.response);
        return data.next();
      });
  });

export const remove = (schemaName: string): any =>
  afterMethod(async meta => {
    const data = await prepMetaData(meta);

    let params: any = await filterParams(meta);
    data.filter["_id"] = params.id;

    schemaName = schemaName.toLowerCase();

    let existingData = null;

    data.request.app.locals[schemaName]
      .findOne(data.filter)
      .populate(data.populateField)
      .then(async result => {
        if (!result) {
          sendResponse(new BasicResponse(Status.NOT_FOUND), data.response);
          return data.next();
        } else {
          existingData = result;
          await validateDataTenant(data, result);
          existingData.status = "DELETED";
          await existingData.save();

          saveActivity(
            schemaName,
            result,
            existingData,
            "delete",
            data.request
          );
          sendResponse(
            new BasicResponse(Status.SUCCESS_NO_CONTENT),
            data.response
          );
          return data.next();
        }
      });
  });

export const removetotal = (schemaName: string): any =>
  afterMethod(async meta => {
    const data = await prepMetaData(meta);

    let params: any = await filterParams(meta);
    data.filter["_id"] = params.id;

    schemaName = schemaName.toLowerCase();

    data.request.app.locals[schemaName]
      .findOneAndDelete(data.filter)
      .populate(data.populateField)
      .then(async result => {
        if (!result) {
          sendResponse(new BasicResponse(Status.NOT_FOUND), data.response);
          return data.next();
        } else {
          saveActivity(
            schemaName,
            result,
            "",
            "totaldelete",
            data.request
          );
          sendResponse(
            new BasicResponse(Status.SUCCESS_NO_CONTENT),
            data.response
          );
          return data.next();
        }
      });
  });

async function validateDataTenant(data, result) {
  let tenantId = data.request.app.locals.userobj.organisationId;
  if (
    (result &&
      result[0] &&
      result[0].tenantId &&
      result[0].tenantId != "default" &&
      tenantId != result[0].tenantId) ||
    (result &&
      result.tenantId &&
      result.tenantId != "default" &&
      tenantId != result.tenantId)
  ) {
    sendResponse(new BasicResponse(Status.CONFLICT), []);
  }
}

export const trailNewRecord = (schemaName: string): any =>
  afterMethod(async meta => {
    let request = meta.args[0];
    let response = meta.args[1];
    let next = meta.args[2];

    meta.result.then(model => {
      let userIdFromDefault = request?.app?.locals?.userobj?.userId
      let userIdFromQueryParam = request?.query?.userId;
      let userIdFromPostData = request?.body?.userId;
      let userIdFromModel = model["userId"];
      model["userId"] = userIdFromDefault || userIdFromQueryParam || userIdFromPostData || userIdFromModel;
      model
        .save()
        .then(entity => {
          if (entity) {
            saveActivity(
              schemaName,
              null,
              entity,
              "create",
              request
            );
            sendResponse(new BasicResponse(Status.CREATED, entity), response);
            return next();
          } else {
            sendResponse(new BasicResponse(Status.ERROR, entity), response);
            return next();
          }
        })
        .catch(err => {
          sendResponse(new BasicResponse(Status.ERROR, err), response);
          return next();
        });
    });
  });

export const trailOldRecord = (schemaName: string): any =>
  afterMethod(async meta => {
    const data = await prepMetaData(meta);

    let params: any = await filterParams(meta);
    data.filter["_id"] = params.id;

    schemaName = schemaName.toLowerCase();

    let existingData = null;

    existingData = await data.request.app.locals[schemaName].findOne(
      data.filter
    );

    meta.result.then(model => {
      model
        .save()
        .then(entity => {
          if (entity) {
            saveActivity(
              schemaName,
              existingData,
              entity,
              "update",
              data.request
            );
            sendResponse(
              new BasicResponse(Status.SUCCESS, entity),
              data.response
            );
            return data.next();
          } else {
            sendResponse(
              new BasicResponse(Status.ERROR, entity),
              data.response
            );
            return data.next();
          }
        })
        .catch(err => {
          sendResponse(new BasicResponse(Status.ERROR, err), data.response);
          return data.next();
        });
    });
  });

async function saveActivity(
  schemaName,
  previousEntity,
  newEntity,
  actionType: string,
  request
) {
  let userInfo = request.app.locals.userobj;

  if (userInfo) {
    let description = `${userInfo.firstname} ${userInfo.lastname} ${actionType} record`;

    let userId =
      schemaName && schemaName == "payment" && !userInfo.userId
        ? "visitors"
        : userInfo.userId;
    let tenantId =
      schemaName && schemaName == "payment" && !userInfo.organisationId
        ? request.query["tenantId"]
        : userInfo.organisationId;

    let secret = { actionType, previousEntity, newEntity };

    let prefixOfAPIName = JSON.parse(`"${process.env.MONGODB_HOST}"`);
    let APIName = JSON.parse(`"${process.env.MONGODB_URL}"`).replace(
      prefixOfAPIName,
      ""
    );
    let theChannel = APIName;

    let activityObj = {
      schemaName,
      description,
      entityId: newEntity && newEntity._id ? newEntity._id : "",
      channel: theChannel,
      secret,
      userId,
      tenantId
    };

    let activity: IActivityModel = request.app.locals.activity(activityObj);

    saveActivityRemotely(request, activity, activityObj);

    return activity;
  } else {
    return null;
  }
}

function saveActivityRemotely(req, activity, activityObj) {
  let userapi = JSON.parse(`"${process.env.userapi}"`);
  let url = userapi + "/user/activitylog";
  axios({
    method: "post",
    url: url,
    headers: { Authorization: req.headers.authorization },
    data: activityObj
  })
    .then(function (response) {
      if (
        response.data &&
        response.data.status &&
        response.data.status == "CREATED"
      ) {
        console.log(
          chalk.green.bold(
            'Activity: "' +
            activity.description +
            " in " +
            activity.schemaName +
            ' schema", Remotely Saved'
          )
        );
        activity.remotelyStored = true;
        setTimeout(function () {
          activity.save();
        }, 500);
      }
    })
    .catch(function (error) {
      console.log(error.response);
    });
}

function sha256(data) {
  return crypto
    .createHash("sha256")
    .update(data, "utf8")
    .digest("base64");
}

function sendResponse(serviceResponse: BasicResponse, responseObj): any {
  var clientResponse = {
    status: serviceResponse.getStatusString(),
    data: serviceResponse.getData(),
    recordCount: serviceResponse.getRecordCount()
  };

  responseObj.status(getHttpStatus(serviceResponse.getStatusString()));

  responseObj.json(clientResponse);
}

function getHttpStatus(status: string): number {
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
