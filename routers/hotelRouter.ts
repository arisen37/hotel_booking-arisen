import { Router } from 'express'
import type { Request, Response } from 'express'
import { authMiddleware } from '../auth';
import { createHotelSchema, createRoomSchema } from '../schema';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';


const hotelRouter = Router();

hotelRouter.post('/api/hotels', authMiddleware, async function (req: Request, res: Response) {
    const result = createHotelSchema.safeParse(req.body);

    if (req.role != 'owner') {
        return res.status(403).send({
            "success": false,
            "data": null,
            "error": "FORBIDDEN"
        })
    }

    if (result.success && result.data) {
        const hotelInfo: {
            owner_id: string,
            name: string,
            description: string | undefined,
            city: string,
            country: string,
            amenities: Array<string> | undefined
        } = {
            owner_id: req.user_id,
            name: result.data.name,
            description: result.data.description,
            city: result.data.city,
            country: result.data.country,
            amenities: result.data.amenities
        }

        try {
            const createHotel = await prisma.hotels.create({
                data: hotelInfo
            })
            return res.status(201).send({
                "success": true,
                "data": {
                    "id": createHotel.id,
                    "ownerId": createHotel.owner_id,
                    "name": createHotel.name,
                    "description": createHotel.description,
                    "city": createHotel.city,
                    "country": createHotel.country,
                    "amenities": createHotel.amenities,
                    "rating": 0.0,
                    "totalReviews": 0
                },
                "error": null
            })
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

hotelRouter.post('/api/hotels/:hotelId/rooms', authMiddleware, async function (req: Request, res: Response) {
    const { hotelId } = req.params;
    const result = createRoomSchema.safeParse(req.body);

    if (result.success && result.data) {
        const roomInfo: {
            hotel_id: string,
            room_number: string,
            room_type: string,
            price_per_night: number,
            max_occupancy: number
        } = {
            hotel_id: hotelId as string,
            room_number: result.data.roomNumber,
            room_type: result.data.roomType,
            price_per_night: result.data.pricePerNight,
            max_occupancy: result.data.maxOccupancy
        }

        try {
            const hotel = await prisma.hotels.findUnique({
                where: { id: hotelId as string }
            })

            if (hotel?.owner_id != req.user_id) {
                return res.status(403).send({
                    "success": false,
                    "data": null,
                    "error": "FORBIDDEN"
                })
            }

            if (!hotel) {
                return res.status(404).send({
                    "success": false,
                    "data": null,
                    "error": "HOTEL_NOT_FOUND"
                })
            }
        } catch (err) {
            return res.status(500).send({
                "success": false,
                "data": null,
                "error": "INTERNAL SERVER ERROR"
            })
        }

        try {
            const room = await prisma.rooms.create({
                data: roomInfo,
            });

            res.status(201).send({
                "success": true,
                "data": {
                    "id": req.user_id,
                    "hotelId": hotelId,
                    "roomNumber": room.room_number,
                    "roomType": room.room_type,
                    "pricePerNight": room.price_per_night,
                    "maxOccupancy": room.max_occupancy,
                },
                "error": null
            })
        }
        catch (err: any) {
            if (err.code == 'P2002') {
                return res.status(400).send({
                    "success": false,
                    "data": null,
                    "error": "ROOM_ALREADY_EXISTS"
                })
            }
        }
    }
    else {
        return res.status(400).send({
            "success": false,
            "data": null,
            "error": "INVALID_REQUEST"
        })
    }
});

hotelRouter.get('/api/hotels', authMiddleware, async function (req: Request, res: Response) {
    const city: string = req.query.city as string
    const country: string = req.query.country as string
    const minPrice: number = parseInt(req.query.minPrice as string)
    const maxPrice: number = parseInt(req.query.maxPrice as string)
    const minRating: number = parseInt(req.query.minRating as string)

    try {
        const hotels = await prisma.hotels.findMany({
            where: {
                city: city,
                country: country,
                rating: {
                    gte: minRating
                }
            },
            include: {
                rooms: true
            }
        })

        const filteredHotels = hotels.map(hotel => {
            let mini = 1000000000;
            let maxi = -1;
            for (let i = 0; i < hotel.rooms.length; i++) {
                mini = Math.min(mini, hotel.rooms[i]?.price_per_night!)
                maxi = Math.max(maxi, hotel.rooms[i]?.price_per_night!)
            }
            if (mini >= minPrice && maxPrice <= maxi) {
                return {
                    id: hotel.id,
                    name: hotel.name,
                    description: hotel.description,
                    city: hotel.city,
                    country: hotel.country,
                    amenities: hotel.amenities,
                    rating: hotel.rating,
                    totalReviews: hotel.total_reviews,
                    minPricePerNight: mini
                }
            }
            else return null;
        })


        return res.status(200).send({
            "success": true,
            "data": filteredHotels,
            "error": null
        })
    }
    catch (err) {
        return res.status(500).send({
            "success": false,
            "data": null,
            "error": "INTERNAL SERVER ERROR"
        })
    }
})


hotelRouter.get('/api/hotels/:hotelId', async function (req: Request, res: Response) {
    const { hotelId } = req.params;

    try {
        const hotels = await prisma.hotels.findUnique({
            where: { id: hotelId as string },
            include: {
                rooms: true
            }
        })

        if (!hotels) {
            return res.status(404).send({
                "success": false,
                "data": null,
                "error": "HOTEL_NOT_FOUND"
            })
        }

        return res.status(200).send({
            "success": true,
            "data": hotels,
            "error": null
        })
    }
    catch (err) {
        return res.status(500).send({
            "success": false,
            "data": null,
            "error": "INTERNAL SERVER ERROR"
        })
    }
})

export { hotelRouter }