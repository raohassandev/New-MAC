export type EndPoints = typeof endpoints;
export const endpoints={
    authUrl: 'http://localhost:3333/', 
    baseUrl: 'http://localhost:3333',
    frontend: {
        amxPrefix:'/amx/api',
        clientPrefix:'/client/api',
        auth:{login:'/auth/login', me:'/auth/me',
            register:'/auth/register'
        }, 
        deviceDriver:{
            baseUrl: `/amx/api/devicedriver`,
            get:'/client/api/devices',
        }
    },
    server:{
        amx:{},
        client: {}
    },
}

/**
 Project
    Client
    Server
        Client
        Amx
 */