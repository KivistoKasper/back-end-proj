const express = require('express');
const router = express.Router();
const { AllowedEmote, Threshold, Interval } = require('../db/db');

router.get('/interval', async (req, res) => {
  try {
    const interval = await Interval.findOne();

    if (!interval) {
      return res.status(404).json({ error: 'Interval not found' });
    }

    return res.status(200).json({ interval: interval.interval });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/interval', async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is required' });
    }
    const { interval } = req.body;
    if (!interval || !Number.isInteger(interval)) {
      return res.status(400).json({ error: 'Provided incorrect type of interval: needs to be integer' });
    }
    if (interval < 10) {
      return res.status(400).json({ error: 'Provided interval too small: needs to be at least 10' });
    }
    const oldInterval = await Interval.findOne();


    if (!oldInterval) {
      const newInterval = await Interval.create({ interval: interval });

      return res.status(200).json({ interval: newInterval.interval });
    }

    oldInterval.interval = interval;
    await oldInterval.save();
    return res.status(200).json({ interval: oldInterval.interval });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/threshold', async (req, res) => {
  try {
    const threshold = await Threshold.findOne();

    if (!threshold) {
      return res.status(404).json({ error: 'Threshold not found' });
    }

    return res.status(200).json({ threshold: threshold.threshold });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/threshold', async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is required' });
    }
    const { threshold } = req.body;
    if (typeof threshold !== 'number' || isNaN(threshold)) {
      return res.status(400).json({ error: 'Provided incorrect type of threshold: needs to be a number' });
    }
    if (threshold <= 0 || threshold > 1) {
      return res.status(400).json({ error: 'Provided threshold out of range: needs to be more than 0 and at most 1' });
    }
    const oldThreshold = await Threshold.findOne();


    if (!oldThreshold) {
      const newThreshold = await Threshold.create({ threshold: threshold });

      return res.status(200).json({ threshold: newThreshold.threshold });
    }

    oldThreshold.threshold = threshold;
    await oldThreshold.save();
    return res.status(200).json({ threshold: oldThreshold.threshold });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/allowed-emotes', async (req, res) => {
  try {
    const emotes = await AllowedEmote.findAll({
      attributes: ['emote'],
      where: {
        isAllowed: true,
      },
    });
    return res.status(200).json(emotes);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/allowed-emotes', async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is required' });
    }
    const updatedEmotes = req.body;
    const [ result, message ] = isAllowedEmoteArray(updatedEmotes);

    if (!result) {
      return res.status(400).json({ error: message });
    }

    for (const updatedEmote of updatedEmotes) {
      const [emote, created] = await AllowedEmote.findOrCreate({
        where: {
          emote: updatedEmote.emote,
        },
        defaults: {
          isAllowed: updatedEmote.isAllowed,
        },
      });
      if (!created && emote.isAllowed !== updatedEmote.isAllowed) {
        await emote.update({ isAllowed: updatedEmote.isAllowed });
      }
    }

    const emotes = await AllowedEmote.findAll({
      attributes: ['emote', 'isAllowed'],
    });

    return res.status(200).json(emotes);
  } catch (error) {
    return res.status(500).json({ error: 'internal server error' });
  }
});

// checks if an object is a valid array that contains the correct fields
const isAllowedEmoteArray = emotes => {
  if (!Array.isArray(emotes)) {
    return [ false, 'Expected an array' ];
  }
  for (let i = 0; i < emotes.length; i++) {
    if (!emotes[i].emote || typeof emotes[i].isAllowed !== 'boolean') {
      return [ false, "Missing 'emote or 'isAllowed' field" ];
    }

    if (!isEmote(emotes[i].emote)) {
      return [ false, `Invalid emote at index ${i}` ];
    }

    if (!(typeof emotes[i].isAllowed === 'boolean')){
      return [ false, `Invalid value of isAllowed at index ${i}` ];
    }
  }
  return [ true, "" ];
}

// checks if an object is a valid emote
const isEmote = emote => {
  const regex = /\p{Extended_Pictographic}/ug;

  if (!emote || !(typeof emote === 'string')) return false;

  // emotes made of multiple code points don't get recognized as emotes
  const exceptions = [ '❤️', ];

  for (let i = 0; i < exceptions.length; i++) {
    if (emote === exceptions[i]) return true;
  }

  if (emote.length !== [...emote].length && [...emote].length === 1) {
    return regex.test(emote);
  } else {
    return false;
  }
}

module.exports = router;
