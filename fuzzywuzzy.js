fuzz = require('fuzzball');

module.exports = function(RED) {
  function FuzzyWuzzyNode(config) {
    RED.nodes.createNode(this, config);
      const node = this;
      
      // get content from choosen input option
      function getInput () {
          if (config.inputOptions === "context") {
              let gotContext = "";
              if (config.contextInput.length < 1) { node.error("please enter a context var"); return ""; }
              try {
                  switch (config.contextType) {
                      case "flow":
                          const flowContext = node.context().flow;
                          gotContext = flowContext.get(config.contextInput);
                          break;
                        
                      case "global":
                          const globalContext = node.context().global;
                          gotContext = globalContext.get(config.contextInput);
                          break;
                  }
              } catch (error) {
                  node.error(`couldnt retrieve choices from context: ${error}`);
                  return "";
              }
              if (!gotContext) { node.error("please enter a valid context var"); return ""; }
              return gotContext;
          } else if (config.inputOptions === "text") {
              return config.choices;
          } else if (config.inputOptions === "message") {
              return "";
          }
      }
      
      let input = getInput();
      
      // map keys to choice lines
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
          }).filter( (p) => p.val.length > 1) // filter empty lines
          return output;
      }
      
      let keyChoicePairs = makeChoices(input);

      const scorer = fuzz[config.scorer]

      const options = {
        wildcards : "*",
        returnObjects : true,
        cutoff : Number(config.cutoff),
        limit: Number(config.limit),
        scorer : scorer
      }

      node.on('input', function(msg) {
          
          if (msg.refresh && config.inputOptions !== "text") {
              if (config.inputOptions !== "message") {
                  input = getInput();
              } else {
                  if (typeof msg.payload !== "string") {
                      node.error('when in "set choices with msg" mode a msg with msg.refresh set must be accompanied by the choices to be set as a single string');
                      return;
                  }
                  input = msg.payload;
              }
              keyChoicePairs = makeChoices(input);
              if (config.inputOptions === "context") {
                  node.warn(`refreshed choices from ${config.contextType}.${config.contextInput}`);
              } else if (config.inputOptions === "message") {
                  node.warn("refreshed choices from msg.payload");
              }
              return;
          }
          
          let choices = keyChoicePairs.map((p) => p.val.toLowerCase())
          const results = fuzz.extract(msg.payload.toLowerCase(), choices, options)

          // map back keys to results
          const resultsWithKeys = results.map( (res) => {
            res.key = keyChoicePairs[res.key].key
            res.input = msg.payload
            return res
          })
          
          msg.payload = resultsWithKeys
          node.send([{...msg, payload: resultsWithKeys.length > 0 ? resultsWithKeys[0] : null }, msg])
      });
  }

  RED.nodes.registerType("fuzzy-match", FuzzyWuzzyNode)
}