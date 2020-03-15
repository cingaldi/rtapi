const socketio = require('socket.io')
const {createServer} = require('http');
const axios = require ('axios')
const redis = require("redis")

let uuid = require("uuid").v4

const {EventEmitter} = require('eventemitter3')

let ee = new EventEmitter()

let subscriberClients = []
let redisClient = redis.createClient()

;(async () => {


    try {

        for (let i = 0 ; i < 1000 ; i++) {

            const subscriberId = uuid()


            let subscriberClient =  redis.createClient()


            subscriberClient.on('error' , (err)=> {
                throw err
            })
    
            subscriberClient.on('connect'  , () => {
                console.log('redis connection established')
            })
    
            await axios.post('http://localhost:3000/subscriptions?device=123&event=temperature' , {subscriberId})
    
            subscriberClient.on('message' , (msg) => {
                    ee.emit(subscriberId)
            })


            ee.on(subscriberId , () => {
                redisClient.lpop(`subscriptions.${subscriberId}` ,(err , msg) => {
                    redisClient.get(`messages.${msg}` , (err , val) => {
                        console.log(`${i} -> message received key: ${msg} - value: ${val}`) 
                    })
                })   
            })

            subscriberClient.subscribe(`notifications.${subscriberId}`)
            subscriberClients.push(subscriberClient)
        }

    }
    catch (err) {
        console.error(`redis connection error : ${err}`)
        process.exit(1)
    }


})()

