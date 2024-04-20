// Import the exported function from the module
const { getMetaAIInstance } = require('./Ai.js');

// Function to handle the MetaAI interaction
async function handleMetaAI(healthChallenge) {
    try {
        // Call the exported function to get the MetaAI instance
        const ai = await getMetaAIInstance();
        
        // Send the user's health challenge to MetaAI
        const response = await ai.prompt({ message: healthChallenge });

        // Print MetaAI response message and sources
        console.log(response.message);
        if (response.sources.length > 0) {
            console.log("Sources:");
            for (const source of response.sources) {
                console.log(source);
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// Example usage: Assuming health_challenge is obtained from the user
const healthChallenge = "User's health challenge";
handleMetaAI(healthChallenge);
