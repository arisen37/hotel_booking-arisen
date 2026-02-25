namespace NodeJS {
    interface ProcessEnv {
        JWT_SECRET: jwt.Secret
    }
}

namespace Express{
    interface Request{
        user_id : string,
        role : 'customer' | 'owner' 
    }
}