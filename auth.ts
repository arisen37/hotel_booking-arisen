import type { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import { config } from 'dotenv'

config();

function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const Token = req.headers.authorization?.split(' ')[1]
    if (!Token) {
        return res.status(401).send({
            "success": false,
            "data": null,
            "error": "UNAUTHORIZED"
        })
    }
    else {
        try {
            const decodedInfo = jwt.verify(Token, process.env.JWT_SECRET) as jwt.JwtPayload;
            req.user_id = decodedInfo.user_id;
            req.role = decodedInfo.role;
            next();
        }
        catch (err) {
            return res.status(401).send({
                "success": false,
                "data": null,
                "error": "UNAUTHORIZED"
            })
        }
    }
}

export { authMiddleware }