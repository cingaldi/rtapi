const { gql } = require('apollo-server');

const typeDefs = gql`
type Query {
  hello : String
}

type Subscription {
  data (topic: String) : DeviceData
}

type DeviceData {
  topic : String
  v : String
  ts : String
}
`;

module.exports = typeDefs;