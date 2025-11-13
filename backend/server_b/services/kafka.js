const { Kafka } = require('kafkajs');
const { Emote, AllowedEmote, Interval } = require('../db/db');
const { analyzeEmotes } = require('./analyzer');

let cachedInterval = 100;

// updates the cached interval
const updateInterval = async () => {
  try {
    const storedInterval = await Interval.findOne();
    if (storedInterval) {
      cachedInterval = storedInterval.interval;
    }
  } catch (error) {
    console.error('Error updating interval:', error);
  }
}

const GROUPID = 'raw-emote-group';
const RAW_DATA_TOPIC = 'raw-emote-data';
const AGGREGATED_DATA_TOPIC = 'aggregated-emote-data';

const kafka = new Kafka({
  clientId: 'server-b',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9094']
});

const consumer = kafka.consumer({ groupId: GROUPID });
const producer = kafka.producer();

// start the process of consuming kafka messages
const run = async () => {
  // updates the cached interval every second
  setInterval(updateInterval, 10 * 1000);
  await consumer.connect();
  await consumer.subscribe({ topic: RAW_DATA_TOPIC, fromBeginning: true });
  let count = 0;
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const parsedMessage = JSON.parse(message.value.toString());
        if (await AllowedEmote.findOne({ where: { emote: parsedMessage.emote }, }) !== null) {
          await Emote.create({
            ...parsedMessage,
            isAnalyzed: false,
          });
          count++;
        }

        if (cachedInterval <= count) {
          await sendSignificantMoments();
          count = 0;
        }
      } catch (error) {
        console.error('Error processing kafka message:', error);
      }
    },
  });
};

// receives significant moments and passes them to kafka
const sendSignificantMoments = async () => {
  const significantMoments = await analyzeEmotes();
  await producer.connect();
  const allowedEmotes = await AllowedEmote.findAll({
    where: { isAllowed: true },
  });
  for (const moment of significantMoments) {
    if (allowedEmotes.some(emote => emote.emote === moment.emote)){
      await producer.send({
        topic: AGGREGATED_DATA_TOPIC,
        messages: [{ value: JSON.stringify(moment) }],
      });
    }
  }
};

module.exports = run;
