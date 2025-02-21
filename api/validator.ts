import express from "express";
import { type ValidationChain } from "express-validator";

import { CommonResponse } from "./common";

export const validate = (validations: ValidationChain[]) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) {
        return CommonResponse.badRequest(`${result.array()[0].msg}`).send(res);
      }
    }
    next();
  };
};
