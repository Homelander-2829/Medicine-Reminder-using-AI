import './App.css';
import Reminder from './components/Reminder';
// import RemainderForm from './components/ReminderForm';
import Clock from './components/Clock';
import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Bars } from 'react-loader-spinner'
const genAI = new GoogleGenerativeAI(`AIzaSyCdrlNjaAMpBkI1tL41UqyK7ii1pf1vRxY`);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
let exampleResponse = `Got it. I've set a reminder for 01:58 for your medication.`;
let message = `Instruction for Gemini:
Whenever the user mentions keywords like "set a reminder," "stop the reminder," or specific times for medication reminders, only respond positively using the predefined responses below. Do not mention anything about being a language model, physical limitations, or additional explanations.  Take the tim from user in 24 hrs time lik example:" 23:52" so if user says like 6 a.m take it as " 06:00" so you should handle it as 24 hrs on a.m and p.m. respectively Just respond as if the reminder is being handled. 
After generating the positive response, just add further string after it and generate anything you want after it following is the string "homlanderTeamIsBest" 
`;


function App() {
  const [recognizedText, setRecognizedText] = useState(message);
  const [isListening, setIsListening] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [inputMessage, setInputMessage] = useState('')
  const [time, setTime] = useState('');
  const [reminderSet, setReminderSet] = useState(false);
  const recognitionRef = useRef(null);
  const [backgroundColor, setBackgroundColor] = useState('#151d23');
  let silenceTimeout;
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [flagNum, setFlagNum] = useState(true);
  const [currentReminder, setCurrentReminder] = useState(null);


  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        if (transcript) {
          setRecognizedText(message + transcript);
          clearTimeout(silenceTimeout);

          silenceTimeout = setTimeout(() => {
            handleUserInput(message + transcript);
          }, 3000); // 3 seconds of silence
        }
      };

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically restart listening only if it's not manually stopped
        if (isListening) {
          toggleListening();
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        clearTimeout(silenceTimeout);
      };

      recognitionRef.current = recognition; // Store recognition in useRef
    } else {
      alert('Your browser does not support speech recognition. Please try Chrome.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearTimeout(silenceTimeout);
    };
  }, []);

  useEffect(() => {
    let intervalId;
    if (currentReminder) {
      intervalId = setInterval(() => {
        setBackgroundColor((prevColor) =>
          prevColor === '#151d23' ? '#3c5364' : '#151d23' // Toggle between #151d23 and #3c5364
        );
      }, 500); // Change color every 500ms
    } else {
      setBackgroundColor('#151d23'); // Reset to default background when no reminder
    }

    // Cleanup interval on unmount or when currentReminder changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentReminder]);


  const handleUserInput = async (input) => {
    if (input.toLowerCase().includes("set a reminder") && time) {
      // setReminder(input);
      return;
    }

    setChatHistory((prev) => [...prev, { role: 'user', text: input }]);

    let response = await model.startChat({
      history: [
        { role: "user", parts: [{ text: input }] },
      ],
    }).sendMessage(input);

    const responseText = response.response.text();
    const trimmedResponse = responseText.split("homlanderTeamIsBest")[0].trim();
    // console.log(trimmedResponse);

    setReminder(trimmedResponse, 1);

    setChatHistory((prev) => [...prev, { role: 'model', text: trimmedResponse }]);
    speak(trimmedResponse);
  };

  const toggleLoader = () => {
    setIsLoading(!isLoading);
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1; // Adjust pitch if needed
    utterance.rate = 1;  // Adjust rate if needed
    speechSynthesis.speak(utterance);
  };

  const toggleListening = async () => {
    toggleLoader();
    if (isListening) {
      recognitionRef.current.stop(); // Stop voice recognition
      setIsListening(false); // Update state to reflect that listening has stopped
      setFlagNum(true); // Reset flagNum to allow playing the message next time
    } else {
      setRecognizedText(message); // Clear previous text
      recognitionRef.current.start(); // Start voice recognition
      setIsListening(true); // Update state to reflect that listening has started

      // Play the welcome message every time starting to listen
      speak("Hello! Please provide the time, medicine name, and dosage for your reminder.");
    }
    toggleLoader();
  };


  const handleInput = (e) => {
    setInputMessage(e.target.value);
  };

  const playAlarm = () => {
    const audio = new Audio('/alarm.mp3'); // Correct path if in the public folder
    audio.play(); // Play the sound
  };

  const setReminder = (trimmedResponse, flag) => {
    const [timePart] = trimmedResponse.match(/(\d{1,2}:\d{2})/); // Extract time from exampleResponse
    const [hours, minutes] = timePart.split(':').map(Number);
    if (flag === 1) setReminders((prev) => [...prev, { timePart, trimmedResponse }]);

    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hours);
    reminderTime.setMinutes(minutes);
    reminderTime.setSeconds(0);

    if (reminderTime < now) {
      reminderTime.setDate(reminderTime.getDate() + 1); // Set for next day if in the past
    }

    const timeout = reminderTime.getTime() - now.getTime();

    setReminderSet(true);
    // alert(`Reminder set for ${timePart}.`); // Notify user that reminder is set

    setTimeout(() => {
      const reminderText = trimmedResponse;
      playAlarm(); // Play the alarm sound
      speak(reminderText); // Announce the reminder

      // Set the reminder details to display
      setCurrentReminder({ time: timePart, message: trimmedResponse });

      setReminderSet(false); // Reset reminder state
      setTime(''); // Clear time input

      // Set another timeout to clear the displayed reminder after 5 seconds
      setTimeout(() => {
        setCurrentReminder(null);
      }, 6000); // Clear reminder details after 5 seconds
    }, timeout);
  }

  const handleTimeChange = (event) => {
    const selectedTime = event.target.value; // Get the selected time
    setTime(selectedTime); // Update state with selected time
  };

  const convertTimeToString = (time) => {
    const [hours, minutes] = time.split(':');
    const formattedHours = String(hours).padStart(2, '0'); // Ensure two digits
    const formattedMinutes = String(minutes).padStart(2, '0'); // Ensure two digits
    return `${formattedHours}:${formattedMinutes}`;
  };

  // Usage


  function handleSubmit() {
    const timeString = convertTimeToString(time); // "06:00"
    const trimmedResponse = timeString + inputMessage;
    setReminder(trimmedResponse, 2);
    setReminders((prev) => [...prev, { timePart: timeString, trimmedResponse: inputMessage }]);
  }

  const handleDeleteReminder = (indexToDelete) => {
    setReminders((prevReminders) =>
      prevReminders.filter((_, index) => index !== indexToDelete)
    );
  };


  return (
    <div className='bg-[#080c0e] w-full h-screen text-white'>
      {/* nav */}
      <div className="h-[60px] w-full bg-black"></div>
      <div className="flex w-full h-[calc(100%-60px)] justify-evenly items-center">
        {/* ?=left */}
        <div className="w-[45%] bg-[#0f1417] rounded-2xl pt-5 pb-5 h-[90%]">
          <div className='h-full w-full flex flex-col justify-between items-center'>
            {/* user */}
            <div className='h-[32%] w-full px-6 py-2 flex justify-between border-b-[4px] pb-6 border-[#080c0e]'>
              <div
                className="h-[100%] w-[76%] rounded-2xl flex items-center text-center justify-center"
                style={{
                  backgroundColor, // Apply the toggling background color
                  transition: 'background-color 0.5s ease-in-out', // Add smooth transition with ease-in-out effect
                }}
              >
                {currentReminder ? (
                  <div className="p-4">
                    <h3 className="text-4xl font-medium tracking-widest mb-2 text-[#746e6e]">
                      {currentReminder.time}
                    </h3>
                    <p className="text-[#746e6e]">Message: {currentReminder.message}</p>
                  </div>
                ) : (
                  <p className='text-2xl text-[#8e8888]'>Active Reminders will be shown here</p>
                )}
              </div>
              <div className="bg-[#151d23] h-[100%] w-[20%] rounded-2xl p-3 mr-1 flex flex-col items-center justify-center">
                {/* Display the gender text based on the state */}
                {isLoading === true?  (
                  <div className="loader-container">
                    <Bars
                      height="50"
                      width="80"
                      color="#4fa94d"
                      ariaLabel="bars-loading"
                      wrapperStyle={{}}
                      wrapperClass=""
                      visible={true}
                    />
                  </div>
                ) : (<div></div>)}
              </div>

            </div>
            {/* reminder */}
            <h4 className='text-white p-2 text-xl'>All Reminders</h4>
            <div className='reminder-container mt-2 h-[75%] rounded-2xl w-full gap-5 flex-wrap overflow-y-scroll pr-5 pl-5'>
              {
                reminders.map((reminder, index) => <Reminder reminder={reminder} index={index} onDelete={handleDeleteReminder} />)
              }
            </div>
          </div>
        </div>
        {/* right */}
        <div className="flex flex-col w-[45%] h-[90%] justify-between">
          <div className="h-[55%] rounded-2xl p-5 bg-[#151d23] relative">
            <Clock />
          </div>
          <div className="h-[39%] rounded-2xl p-5 bg-[#151d23]">
            <div className="h-[47%] rounded-2xl bg-[#151d23] text-white">
              <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
                <div className="flex item-center w-full h-[40px]">
                  <h3 className="text-center flex justify-center items-center text-xl">Time</h3>
                  <input
                    type="time"
                    id="time"
                    value={time}
                    onChange={handleTimeChange}
                    className="bg-[#252d32] rounded-md text-white px-10 ml-[68px]"
                    required
                  />
                </div>

                <div className="flex item-center w-full h-[40px] gap-8 ">
                  <h3 className="text-center flex justify-center items-center text-xl">Message</h3>
                  <input
                    type="text"
                    id="message"
                    onChange={handleInput}
                    value={inputMessage}
                    className="p-2 bg-[#252d32] px-3 rounded-md text-white w-full outline-none"
                    required
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  className="bg-blue-700 hover:bg-blue-950 text-white p-2 rounded"
                // onClick={() => setReminder(recognizedText)}
                >
                  Submit
                </button>

                <button
                  type="button"
                  className="bg-green-500 hover:bg-green-600 text-white p-2 rounded"
                  onClick={toggleListening}
                >
                  {isListening ? 'Stop Listening' : 'Start Listening'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
};

export default App;