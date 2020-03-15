const { PubSub , ApolloServer} = require('apollo-server');

const typeDefs = require('./schema')

const pubsub = new PubSub();

let topics = {}


const resolvers = {
    Query : {
        hello () {return "ciao"}
    },
    Subscription: {
      data: {
        subscribe: (model, args, context, info) => {

            topics[args.topic] = setInterval(() => {
                pubsub.publish(args.topic , { data : {topic : args.topic , v : Math.round(Math.random()*1000) , ts : Date.now().toString()}})
            } , 1000)

            return pubsub.asyncIterator(Object.keys(topics))
        },
      },
    }
};


const server = new ApolloServer({typeDefs , resolvers , playground: { version: '1.7.25' }})

server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
