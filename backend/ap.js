# Define system message
system_message = "Welcome to our healthcare assistance system. Before connecting you with a doctor, could you please describe your health challenge?"

# Print system message
print(system_message)

# Prompt user for their health challenge
health_challenge = input("Please type in your health challenge: ")

# Import the getMetaAIInstance function from the module where it's defined
import { getMetaAIInstance } from "./Ai.js"

# Use the imported function to get the MetaAI instance
ai = getMetaAIInstance()

# Send user's health challenge to MetaAI
response = ai.prompt(message=health_challenge)

# Print MetaAI response message and sources
print(response['message'])
if response['sources']:
    print("Sources:")
    for source in response['sources']:
        print(source)

