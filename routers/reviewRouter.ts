import { Router } from 'express'
import type { Request, Response } from 'express'
import { authMiddleware } from '../auth';
import { createReviewSchema } from '../schema';
import { prisma } from '../db';


const reviewRouter = Router();

reviewRouter.post('/api/reviews', authMiddleware, async function (req: Request, res: Response) {
    const result = createReviewSchema.safeParse(req.body);
    if (result.success && result.data) {

        const booking = await prisma.bookings.findUnique({
            where: { id: result.data.bookingId }
        });

        if (!booking) {
            return res.status(404).send({
                "success": false,
                "data": null,
                "error": "BOOKING_NOT_FOUND"
            })
        }

        if (booking.user_id != req.user_id) {
            return res.status(403).send({
                "success": false,
                "data": null,
                "error": "FORBIDDEN"
            })
        }

        const bookingInfo: {
            user_id: string,
            hotel_id: string,
            room_id: string,
            booking_id: string,
            rating: number,
            comment: string,
        } = {
            user_id: booking.user_id,
            hotel_id: booking.hotel_id,
            room_id: booking.room_id,
            booking_id: result.data.bookingId,
            rating: parseInt(result.data.rating),
            comment: result.data.comment
        }

        const reviewFind = await prisma.reviews.findUnique({
            where: { booking_id: result.data.bookingId }
        })

        if (reviewFind) {
            return res.status(400).send({
                "success": false,
                "data": null,
                "error": "ALREADY_REVIEWED"
            })
        }

        let currentTime = new Date();

        if (currentTime < booking.check_out_date) {
            return res.status(400).send({
                "success": false,
                "data": null,
                "error": "BOOKING_NOT_ELIGIBLE"
            })
        };

        const reviewCreate = await prisma.reviews.create({
            data: bookingInfo
        })

        const hotel = await prisma.hotels.findUnique({
            where : { id : booking.hotel_id}
        })

        const hotelUpdate = await prisma.hotels.update({
            where : {id : booking.hotel_id},
            data : {
                total_reviews : hotel?.total_reviews! + 1,
                rating : ((hotel?.rating!)*(hotel?.total_reviews!) + parseInt(result.data.rating))/(hotel?.total_reviews! + 1)
            }
        })

        return res.status(201).send({
            "success": true,
            "data": {
                "id": reviewCreate.id,
                "userId": req.user_id,
                "hotelId": booking.hotel_id,
                "bookingId": booking.id,
                "rating": parseInt(result.data.rating),
                "comment": result.data.comment,
                "createdAt": currentTime.toISOString(),
            },
            "error": null
        })
    }
    else {
        return res.status(400).send({
            "success": false,
            "data": null,
            "error": "INVALID_REQUEST"
        })
    }
})

export { reviewRouter }