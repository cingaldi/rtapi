const express = require("express")
const amqp = require("amqplib")
const redis = require("redis")

const app = express()

app.use(express.json())

let channel
let redisClient

app.post('/subscriptions' , (req , res , next) => {

    if (channel) {
        let device = req.query.device
        let event = req.query.event
        let subscriberId = req.body.subscriberId

        const routingKey = `devices.${device}.${event}`
        console.log(`client <${subscriberId}> subscribes to topic ${routingKey}`)
        channel.bindQueue ('worker' , 'amq.topic' , routingKey)
        
        redisClient.hset(`topics.${routingKey}` , subscriberId , "aaa" , () => {
            res.sendStatus(201)
        })
        
    }
})

app.delete('/subscriptions' , (req , res , next) => {

    if (channel) {
        let subscriberId = req.body.subscriberId

        const routingKey = `devices.${req.query.device}.${req.query.event}`
        console.log(`client unsubscribes to topic ${routingKey}`)
        channel.unbindQueue ('worker' , 'amq.topic' , routingKey)        
        
        redisClient.hdel(`topics.${routingKey}` , subscriberId, subscriberId)
        res.sendStatus(204)
    }
})

const server = app.listen(3000 , async (port) => {

    try {
        let conn = await amqp.connect("amqp://localhost:5672/")
        console.log("amqp connection established")

        channel = await conn.createChannel()
        await channel.assertQueue('worker')
        console.log('topology configured')

        channel.consume('worker' , (msg) =>{
            console.log(`received data: ${msg.content.toString()}`)
            redisClient.set(`messages.${msg.fields.deliveryTag}`, msg.content.toString() )
            redisClient.expire(`messages.${msg.fields.deliveryTag}` , 12)

            redisClient.hgetall(`topics.${msg.fields.routingKey}` , (err , res) =>{

                for (let sub in res) {
                    redisClient.lpush(`subscriptions.${sub}` , msg.fields.deliveryTag , () => {
                        redisClient.expire(`subscriptions.${sub}` , 10)
                        redisClient.hset(`topics.${msg.fields.routingKey}` , sub , msg.fields.deliveryTag , () => {
                            redisClient.publish(`notifications.${sub}` , Buffer.from(msg.fields.deliveryTag.toString()))
                        })
                    })
                }
                channel.ack(msg)

            } )
        })

    }
    catch (err) {
        console.error(`amqp connection error: ${err}`)
        process.exit(1)
    }

    try {
        redisClient =  redis.createClient()

        redisClient.on('error' , (err)=> {
            throw err
        })

        redisClient.on('connect'  , () => {
            console.log('redis connection established')
        })
    }
    catch (err) {
        console.error(`redis connection error : ${err}`)
        process.exit(1)
    }


    console.log(`http server listening on port ${server.address().port}`)
})