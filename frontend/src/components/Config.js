// in config.js
import { createChatBotMessage } from 'react-chatbot-kit';
import DogPicture from './DogPicture';
const botName = 'MedChat';

const config = {
  initialMessages: [createChatBotMessage(`Hi! I'm ${botName}`)],
  widgets: [
    {
      widgetName: 'dogPicture',
      widgetFunc: (props) => <DogPicture {...props} />,
    },
  ],
  botName: botName,
  customStyles: {
    botMessageBox: {
      backgroundColor: '#363EFF',
    },
    chatButton: {
      backgroundColor: '#363EFF',
    },
  },
};

export default config;