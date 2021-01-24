fuzz = require('fuzzball');

module.exports = function(RED) {
  function FuzzyWuzzyNode(config) {
    RED.nodes.createNode(this, config);
      const node = this;

      // map keys to choice lines
      const keyChoicePairs = config.choices.split('\n').map( (line,i) => {
        if (line.includes(":")) {
          let [ key, val ] = line.split(":");
          return {
            key: key,
            val: val
          }
        } else {
          return {
            key: i,
            val: line
          }
        }
      }).filter( (p) => p.val.length > 1) // filter empty lines

      const scorer = fuzz[config.scorer]

      const options = {
        wildcards : "*",
        returnObjects : true,
        cutoff : Number(config.cutoff),
        limit: Number(config.limit),
        scorer : scorer
      }

      node.on('input', function(msg) {
          let choices = keyChoicePairs.map((p) => p.val.toLowerCase())
          const results = fuzz.extract(msg.payload.toLowerCase(), choices, options)

          // map back keys to results
          const resultsWithKeys = results.map( (res) => {
            res.key = keyChoicePairs[res.key].key
            return res
          })
          
          msg.results = resultsWithKeys
          node.send(msg)
      });
  }

  RED.nodes.registerType("fuzzy-match", FuzzyWuzzyNode)
}