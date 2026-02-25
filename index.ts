import express from 'express'
import type { Express } from 'express';
import { bookingRouter  } from './routers/bookingRouter';
import { hotelRouter } from './routers/hotelRouter';
import { reviewRouter } from './routers/reviewRouter';
import { userRouter } from './routers/userRouter';

const app : Express = express();

app.use(express.json());
app.use('/' , userRouter)
app.use('/' , hotelRouter)
app.use('/' , reviewRouter)
app.use('/' , bookingRouter)

app.listen(3000, ()=>{
    console.log("Sever is RUNNING")
});