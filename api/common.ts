import { type Response } from "express";

export enum CommonStatus {
  SUCCESS = 0,
  FAILED = 1,
}

export enum Used {
  unused = 0,
  used = 1,
}

export enum Permanent {
  impermanent = 0,
  permanent = 1,
}

export enum NullId {
  null = 0,
}

export enum TvlHourState {
  create = 0,
  pending = 1,
  success = 2,
  failed = -1,
}

export const ResponseMessage = {
  NO_AUTH_TO_ACCESS: "need auth",
  INVALID_BEARER_TOKEN: "invalid bearer token",
  SERVER_ERR: "server err",
  INVALID_EDITION: "invalid edition",
  INVALID_BUCKET_UUID: "invalid bucket uuid",
  EDITION_OVERDUE: "edition overdue",
};

export class CommonResponse {
  code: number;
  message: string;
  data: any;

  constructor(code: number, message: string, data: any) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  static success(data?: any): CommonResponse {
    return new CommonResponse(ResponseCode.Success, "success", data);
  }

  static badRequest(msg: string): CommonResponse {
    return new CommonResponse(ResponseCode.BadRequest, msg, null);
  }

  static serverError(msg: string): CommonResponse {
    return new CommonResponse(ResponseCode.ServerError, msg, null);
  }

  static unauthorized(msg: string): CommonResponse {
    return new CommonResponse(ResponseCode.Unauthorized, msg, null);
  }

  static forbidden(msg: string): CommonResponse {
    return new CommonResponse(ResponseCode.Forbidden, msg, null);
  }

  static notfound(msg: string): CommonResponse {
    return new CommonResponse(ResponseCode.NotFound, msg, null);
  }

  send(res: Response) {
    res.status(this.code).json(this);
  }
}

export enum ResponseCode {
  ServerError = 500,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  Forbidden = 403,
  Success = 200,
}
