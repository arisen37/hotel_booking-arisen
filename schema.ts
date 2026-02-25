import * as z from 'zod'

const signupSchema = z.object({
    name : z.string().max(255),
    email : z.email().max(255),
    password : z.string().max(255),
    role : z.enum(["customer" , "owner"]).optional(),
    phone : z.string().max(20).optional(),
})

const loginSchema = z.object({
    email : z.email().max(255),
    password : z.string().max(255),
})

const createHotelSchema = z.object({
    name : z.string().max(255),
    description : z.string().max(255).optional(),
    city : z.string().max(255),
    country : z.string().max(255),
    amenities : z.array(z.string()).default([]).optional(),
})

const createRoomSchema = z.object({
    roomNumber : z.string().max(255),
    roomType : z.string().max(100),
    pricePerNight : z.number(),
    maxOccupancy : z.number(),
})

const createBookingSchema = z.object({
    roomId : z.string(),
    checkInDate : z.date(),
    checkOutDate : z.date(),
    guests : z.number(),
})

const createReviewSchema = z.object({
    bookingId : z.string(),
    rating : z.string(),
    comment : z.string(),
})

export {signupSchema , loginSchema , createHotelSchema , createRoomSchema , createBookingSchema , createReviewSchema}


