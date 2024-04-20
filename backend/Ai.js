const { PythonShell } = require('python-shell');

/* Function to run the Python script and get the MetaAI instance */
async function getMetaAIInstance() {
    try {
        const MetaAI = await PythonShell.run('MetaAi.py');
        return MetaAI;
    } catch (error) {
        throw error;
    }
}

module.exports = {
  getMetaAIInstance
};
