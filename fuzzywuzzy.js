fuzz = require('fuzzball');

module.exports = function(RED) {
  function FuzzyWuzzyNode(config) {
    RED.nodes.createNode(this, config);
      const node = this;
      
      // creates choice array from input string
      function makeChoices (choices) {
          const output = choices.split('\n').map( (line,i) => {
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
          }).filter( (p) => p.val.length > 0) // filter empty lines
          return output;
      }

      let keyChoicePairs = config.inputOptions == 'message' ? [] : makeChoices(config.choices);

      const scorer = fuzz[config.scorer]
      const options = {
        wildcards : "*",
        returnObjects : true,
        cutoff : Number(config.cutoff),
        limit: Number(config.limit),
        scorer : scorer
      }

      node.on('input', function(msg) {
          if (config.inputOptions == 'message' && 'choices' in msg) {
            try {
              keyChoicePairs = makeChoices(msg.choices);
            } catch(err) {
              node.error("Could not load choices from msg.choices", msg)
              return
            }
          }

          if (typeof msg.payload !== "string") {
            return
          }
          
          let choices = keyChoicePairs.map((p) => p.val.toLowerCase())
          const results = fuzz.extract(msg.payload.toLowerCase(), choices, options)

          // map back keys to results
          const resultsWithKeys = results.map( (res) => {
            res.key = keyChoicePairs[res.key].key
            res.input = msg.payload
            return res
          })
          
          node.send([{...msg, payload: resultsWithKeys.length > 0 ? resultsWithKeys[0] : null }, {...msg, payload: resultsWithKeys }])
      });
  }

  RED.nodes.registerType("fuzzy-match", FuzzyWuzzyNode)
}