const { Emote, Threshold } = require('../db/db');
const { Op } = require('sequelize');

const analyzeEmotes = async () => {
  try {
    const emotes = await Emote.findAll({
      where: {
        isAnalyzed: false,
      }
    });
    const threshold = await Threshold.findOne();
    const significantMoments = [];
    const emoteCounts = {};

    for (const record of emotes) {
      const timestamp = record.timestamp.slice(0,19);
      const emote = record.emote;

      if (!emoteCounts[timestamp]) {
        emoteCounts[timestamp] = { total: 0 };
      }

      if (!emoteCounts[timestamp][emote]) {
        emoteCounts[timestamp][emote] = 0;
      }

      emoteCounts[timestamp][emote]++;
      emoteCounts[timestamp].total++;

      await record.update({ isAnalyzed: true });
    }

    for (const timestamp in emoteCounts) {
      const counts = emoteCounts[timestamp];

      for (const emote in counts) {
        if (emote !== 'total' && counts[emote] / counts.total >= threshold.threshold) {
          significantMoments.push({
            timestamp,
            emote,
            count: counts[emote],
          });
        }
      }
    }
    return significantMoments;
  } catch (error) {
    console.error("Error analyzing emotes:", error);
  }

};


module.exports = { analyzeEmotes };
