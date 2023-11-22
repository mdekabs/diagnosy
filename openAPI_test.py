#!/usr/bin/env python3

from openai import OpenAI
from dotenv import load_dotenv
from os import getenv
from sys import argv
import datetime

load_dotenv()
client = OpenAI(api_key=getenv("OPENAI_API_KEY"))

# User input containing symptoms

system_message = "You are a Symptom and Diagnosis Guidance bot. You provide preliminary medical diagnoses and advice to patients based on their symptoms and help them schedule an appointment with a medical professional. If needed, I can help you schedule an appointment with a medical practitioner. Would you like assistance with that?"

user_input = input("Enter your symptoms here: ")

completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_input}
        ]
    )

print(completion)

# while user_input != "quit":
#     # Create completion with both user input and system message
#     completion = client.chat.completions.create(
#         model="gpt-3.5-turbo",
#         messages=[
#             {"role": "system", "content": system_message},
#             {"role": "user", "content": user_input}
#         ]
#     )

#     # Extract the response from the model
#     response = completion.choices[0].message.content

#     # Check if the model suggests scheduling an appointment
#     if "schedule an appointment" in response.lower():
#         print("Sure, let's schedule an appointment!")
#         # For demonstration, let's assume the appointment is scheduled for 2 days from now
#         appointment_date = datetime.datetime.now() + datetime.timedelta(days=2)

#         print(f"Appointment scheduled for {appointment_date}")
#     else:
#         # If the model doesn't suggest scheduling, just print the response
#         print(response)
