import { Router } from 'express'
import type { Request, Response } from 'express'
import * as bcrypt from 'bcrypt'
import { loginSchema, signupSchema } from '../schema.ts'
import { prisma } from '../db.ts';
import * as jwt from 'jsonwebtoken'


const userRouter = Router();

userRouter.post('/api/auth/signup', async function (req: Request, res: Response) {
    const result = signupSchema.safeParse(req.body);
    if (result.success && result.data) {

        bcrypt.hash(result.data.password, 5, async function (err, hash) {

            if (err) {
                return res.status(500).send({
                    "success": false,
                    "data": null,
                    "error": "INTERNAL SERVER ERROR"
                })
            }

            const userInfo: {
                name: string,
                email: string,
                password: string,
                role: "customer" | "owner"
                phone: string | undefined,
                createdAt: Date
            } = {
                name: result.data.name,
                email: result.data.email,
                password: hash,
                role: (result.data.role) ? result.data.role : 'customer',
                phone: result.data.phone,
                createdAt: new Date()
            }

            try {
                const user = await prisma.users.create({
                    data: userInfo
                })
                return res.status(201).send({
                    "success": true,
                    "data": {
                        "id": user.id,
                        "name": user.name,
                        "email": user.email,
                        "role": user.role,
                        "phone": user.phone
                    },
                    "error": null
                })
            }
            catch (err: any) {
                if (err.code == 'P2002') {
                    return res.status(400).send(
                        {
                            "success": false,
                            "data": null,
                            "error": "EMAIL_ALREADY_EXISTS"
                        }
                    )
                }
                else {
                    return res.status(500).send({
                        "success": false,
                        "data": null,
                        "error": "INTERNAL SERVER ERROR"
                    })
                }
            }
        })
    } else {
        return res.status(400).send({
            "success": false,
            "data": null,
            "error": "INVALID_REQUEST"
        })
    }
});

userRouter.post('/api/auth/login', async function (req: Request, res: Response) {
    const result = loginSchema.safeParse(req.body);
    if (result.success && result.data) {
        const email = result.data.email;
        const password = result.data.password;

        const user = await prisma.users.findUnique({
            where: { email: email },
        })

        if (!user) {
            return res.status(401).send({
                "success": false,
                "data": null,
                "error": "INVALID_CREDENTIALS"
            })
        }

        bcrypt.compare(password, user?.password, function (err, result) {
            if (!result) {
                return res.status(401).send({
                    "success": false,
                    "data": null,
                    "error": "INVALID_CREDENTIALS"
                })
            }
            else {
                const JWT_TOKEN = jwt.sign({
                    user_id: user.id,
                    role: user.role
                }, process.env.JWT_SECRET)

                return res.status(200).send({
                    "success": true,
                    "data": {
                        "token": JWT_TOKEN,
                        "user": {
                            "id": user.id,
                            "name": user.name,
                            "email": user.email,
                            "role": user.role
                        }
                    },
                    "error": null
                })
            }
        })
    }
    else {
        return res.status(400).send({
            "success": false,
            "data": null,
            "error": "INVALID_REQUEST"
        })
    }
});

export { userRouter }