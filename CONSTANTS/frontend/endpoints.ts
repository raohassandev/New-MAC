export type EndPoints = typeof endpoints;
export const endpoints={
    authUrl: 'http://localhost:3333/', 
    baseUrl: 'http://localhost:3333',
    frontend: {
        amxPrefix:'/amx/api',
        clientPrefix:'/',
        auth:{login:'/auth/login', me:'/auth/me',
            register:'/auth/register'
        }, 
        deviceDriver:{
            baseUrl: `/amx/api/devicedriver`,
            get:'/devices',
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