import { Router } from 'express'
import type { Request, Response } from 'express'
import { authMiddleware } from '../auth';
import { createBookingSchema } from '../schema';
import { prisma } from '../db';

const bookingRouter = Router();

bookingRouter.post('/api/bookings', authMiddleware, async function (req: Request, res: Response) {
    const result = createBookingSchema.safeParse(req.body)

    if (result.success && result.data) {

        try {
            const currentRoom = await prisma.rooms.findUnique({
                where: { id: result.data.roomId },
            })

            if (!currentRoom) {
                return res.status(404).send({
                    "success": false,
                    "data": null,
                    "error": "ROOM_NOT_FOUND"
                })
            }

            try {
                const currentHotel = await prisma.hotels.findUnique({
                    where: { id: currentRoom?.hotel_id }
                })

                if (currentHotel?.owner_id == req.user_id) {
                    return res.status(403).send({
                        "success": false,
                        "data": null,
                        "error": "FORBIDDEN"
                    })
                }
            }
            catch (err) {
                return res.status(500).send({
                    "success": false,
                    "data": null,
                    "error": "INTERNAL SERVER ERROR"
                })
            }

            const checkOut: Date = new Date(result.data.checkOutDate)
            const checkIn: Date = new Date(result.data.checkInDate)
            const today = new Date()

            if (checkIn < today) {
                return res.status(400).send({
                    "success": false,
                    "data": null,
                    "error": "INVALID_DATES"
                })
            }
            let nights: number = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
            let totalPrice: number = nights * (currentRoom?.price_per_night!)

            if (currentRoom?.max_occupancy! < result.data.guests) {
                return res.status(400).send({
                    "success": false,
                    "data": null,
                    "error": "INVALID_CAPACITY"
                })
            }

            const booking = await prisma.bookings.findMany({
                where: {
                    check_in_date: {
                        gte: checkIn,
                        lte: checkOut
                    }
                }
            })

            if (booking) {
                res.status(400).send({
                    "success": false,
                    "data": null,
                    "error": "ROOM_NOT_AVAILABLE"
                })
            }

            const bookingInfo: {
                user_id: string,
                hotel_id: string,
                room_id: string,
                check_in_date: Date,
                check_out_date: Date,
                guests: number
                total_price: number
            } = {
                user_id: req.user_id,
                hotel_id: currentRoom?.hotel_id!,
                room_id: currentRoom?.id!,
                check_in_date: new Date(result.data.checkInDate),
                check_out_date: new Date(result.data.checkOutDate),
                guests: result.data.guests,
                total_price: totalPrice
            }

            try {
                const bookings = await prisma.bookings.create({
                    data: bookingInfo
                })

                return res.status(201).send({
                    "success": true,
                    "data": {
                        "id": bookings.id,
                        "userId": req.user_id,
                        "roomId": result.data.roomId,
                        "hotelId": currentRoom?.hotel_id,
                        "checkInDate": result.data.checkInDate,
                        "checkOutDate": result.data.checkOutDate,
                        "guests": result.data.guests,
                        "totalPrice": totalPrice,
                        "status": "confirmed",
                        "bookingDate": new Date().toISOString
                    },
                    "error": null
                })
            }
            catch (err) {
                throw err
            }
        }
        catch (err) {
            return res.status(500).send({
                "success": false,
                "data": null,
                "error": "INTERNAL SERVER ERROR"
            })
        }
    }
    else {
        return res.status(400).send({
            "success": false,
            "data": null,
            "error": "INVALID_REQUEST"
        })
    }
})

bookingRouter.patch('/api/bookings/:bookingId/cancel', authMiddleware, async function (req: Request, res: Response) {
    const { bookingId } = req.params
    const currentTime: Date = new Date();
    try {

        const bookingFind = await prisma.bookings.findUnique({
            where: { id: bookingId as string }
        })

        if (!bookingFind) {
            return res.status(404).send({
                "success": false,
                "data": null,
                "error": "BOOKING_NOT_FOUND"
            })
        }

        if (bookingFind?.user_id != req.user_id) {
            return res.status(403).send({
                "success": false,
                "data": null,
                "error": "FORBIDDEN"
            })
        }

        if (!bookingFind?.cancelled_at) {
            return res.status(400).send({
                "success": false,
                "data": null,
                "error": "ALREADY_CANCELLED"
            })
        }

        if (currentTime.getTime() + 24 * 60 * 60 < bookingFind.booking_date.getTime()) {
            return res.status(400).send({
                "success": false,
                "data": null,
                "error": "CANCELLATION_DEADLINE_PASSED"
            })
        }

        const bookingUpdate = await prisma.bookings.update({
            where: { id: bookingId as string },
            data: { cancelled_at: currentTime },
        })

        return res.status(200).send({
            "success": true,
            "data": {
                "id": bookingId,
                "status": "cancelled",
                "cancelledAt": currentTime.toISOString(),
            },
            "error": null
        })
    }
    catch (err) {
        res.status(500).send({
            "success": false,
            "data": null,
            "error": "INTERNAL SERVER ERROR"
        })
    }
})

export { bookingRouter }